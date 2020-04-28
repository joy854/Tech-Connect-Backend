const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cors = require('cors');
require('dotenv').config();
const app = express();
app.use(cors());
app.use(bodyParser.json());
// app.use((req, res, next) => {
//   res.header('Access-Control-Allow-Origin', '*');
//   next();
// });
const knex = require('knex');
const saltRounds = 10;
const db = knex({
  //connect server to database
  client: 'pg',
  connection: {
    // host: '127.0.0.1',
    // user: 'postgres',
    // password: 'postgres',
    // database: 'joy',
    connectionString: process.env.DATABASE_URL,
    ssl: true,
  },
});
// db.select('*')
//   .from('users')
//   .then((rows) => console.log(rows));
app.post('/storeSkill', (req, res) => {
  // console.log(req.body);
  const { skill_title, id } = req.body;
  db('skills')
    .returning('*')
    .insert({
      id,
      skill_title,
    })
    .then((user) => res.json(user[0])); //only 1 row changed thus only 1 row of this query
  // .catch((err) => res.status(400).json('Error'));
});

app.get('/getSkills', (req, res) => {
  db.select('*')
    .from('skills')
    .then((data) => {
      if (data.length) res.json(data);
      else res.status(400).json('error');
    })
    .catch((err) => res.status(400).json('error'));
});

app.post('/register', (req, res) => {
  //   res.send('Ho');
  console.log(req.body, 'HI');
  const {
    fName,
    lName,
    city,
    country,
    image,
    institute,
    org,
    bio,
    email,
    password,
    username,
    // skill,
  } = req.body;
  console.log(req.body);
  // if (!password) res.status(400).json('Empty'); done at frontend
  const hash = bcrypt.hashSync(password, saltRounds);

  db('users')
    .returning('*')
    .insert({
      fname: fName,
      lname: lName,
      city,
      country,
      image,
      org,
      institute,
      bio,
      email,
      username,
      password: hash,
      joined: new Date(),
    })
    .then((user) => res.json(user[0])) //only 1 row changed thus only 1 row of this query
    .catch((err) => res.status(400).json('Error'));
  // db('skills')
  // .returning('*')
});
app.post('/signin', (req, res) => {
  const { email, password } = req.body;
  db.select('email', 'id', 'password')
    .from('users')
    .where('email', '=', email)
    .then((data) => {
      const isValid = bcrypt.compareSync(password, data[0].password);
      if (isValid) {
        return db
          .select('*')
          .from('users')
          .where('email', '=', email)
          .then((user) => {
            res.json(user[0]);
          })
          .catch((err) => res.status(400).json('unable to get user'));
      } else {
        res.status(400).json('wrong credentials');
      }
    })
    .catch((err) => res.status(400).json('wrong credentials'));
});

app.post('/getDetails', (req, res) => {
  const { userid } = req.body;
  console.log(req.body);
  db.select('*')
    .from('users')
    .where('id', '=', userid)
    .then((data) => {
      if (data.length) res.json(data[0]);
      else res.status(400).json('error');
    })
    .catch((err) => res.status(400).json('error'));
});

app.post('/insertPost', (req, res) => {
  const { text, url, id, post_id } = req.body;
  db.select('username', 'fname', 'lname', 'image')
    .from('users')
    .where({ id: id })
    .then(function (rows) {
      // return db.insert({id: rows[0].id, post_id: post_id}, 'id').into('posts');
      return db('posts')
        .returning('*')
        .insert({
          content: text,
          post_url: url,
          id,
          post_id,
          time_of_creation: new Date(),
          image_url: rows[0].image,
          username: rows[0].username,
          fname: rows[0].fname,
          lname: rows[0].lname,
        })
        .then((user) => res.json(user[0]))
        .catch((err) => res.status(400).json('Error'));
    });
});

app.post('/deletePost', (req, res) => {
  const { id, postid } = req.body;
  console.log(req.body);
  db('posts')
    .returning('*')
    .where({
      id,
      post_id: postid,
    })
    .del()
    .then((user) => res.json(user[0]))
    .catch((err) => res.status(400).json('Error'));
});

app.post('/getPosts', (req, res) => {
  const { userid } = req.body;
  console.log('getposts', userid);
  // var subquery = db('users')
  //   .join('follows', userid, '=', 'follows.from_id')
  //   .select('follows.to_id');
  var subquery = db.select('to_id').from('follows').where('from_id', userid);
  db.select('*')
    .from('posts')
    .where('id', 'in', subquery)
    .orWhere('id', userid)
    .orderBy('time_of_creation', 'desc')
    .then((data) => {
      if (data.length) res.json(data);
      else res.status(400).json('error');
    })
    .catch((err) => res.status(400).json('error'));
});

app.post('/users/:id', (req, res) => {
  const id = req.params.id;
  // console.log(req.body);
  db.select('*')
    .from('users')
    .where('id', '=', id)
    .then((data) => {
      if (data.length) res.json(data[0]);
      else res.status(400).json('Profile Does not exist!');
    })
    .catch((err) => res.status(400).json('error'));
});

app.get('/users', (req, res) => {
  db.select('*')
    .from('users')
    .then((data) => {
      if (data.length) res.json(data);
      else res.status(400).json('Not found');
    })
    .catch((err) => res.status(400).json('Not found'));
});

app.get('/getFollowers', (req, res) => {
  db.select('*')
    .from('follows')
    .then((data) => {
      if (data.length) res.json(data);
      else res.status(400).json('error');
    })
    .catch((err) => res.status(400).json('error'));
});

app.post('/insertFollowers', (req, res) => {
  const { from_id, to_id } = req.body;
  console.log(req.body);
  db('follows')
    .returning('*')
    .insert({
      from_id,
      to_id,
    })
    .then((user) => res.json(user[0]))
    .catch((err) => res.status(400).json('Error'));
});

app.post('/deleteFollowers', (req, res) => {
  const { from_id, to_id } = req.body;
  console.log(req.body);
  db('follows')
    .returning('*')
    .where({
      from_id,
      to_id,
    })
    .del()
    .then((user) => res.json(user[0]))
    .catch((err) => res.status(400).json('Error'));
});

app.post('/insertComment', (req, res) => {
  const {
    username,
    fname,
    lname,
    commenter_id,
    id,
    comment_id,
    post_id,
    image,
    content,
  } = req.body;
  console.log(req.body);
  db('comments')
    .returning('*')
    .insert({
      username,
      fname,
      lname,
      commenter_id,
      id,
      post_id,
      image,
      content,
      comment_id,
      comment_time: new Date(),
    })
    .then((user) => res.json(user[0]))
    .catch((err) => res.status(400).json('Error'));
});

app.post('/deleteComment', (req, res) => {
  const { id, comment_id, post_id } = req.body;
  console.log(req.body);
  db('comments')
    .returning('*')
    .where({
      id,
      comment_id,
      post_id,
    })
    .del()
    .then((user) => res.json(user[0]))
    .catch((err) => res.status(400).json('Error'));
});

app.post('/getComments', (req, res) => {
  const { userid } = req.body;
  console.log('getcomments', userid);
  var initialsubquery = db
    .select('to_id')
    .from('follows')
    .where('from_id', userid);

  var secondsubquery = db
    .select('id', 'post_id')
    .from('posts')
    .where('id', 'in', initialsubquery)
    .orWhere('id', userid);
  // .orderBy('time_of_creation', 'desc');

  db.select('*')
    .from('comments')
    .whereIn(['id', 'post_id'], secondsubquery)
    .orderBy('comment_time', 'desc')
    .then((data) => {
      if (data.length) res.json(data);
      else res.status(400).json('error');
    })
    .catch((err) => res.status(400).json('error'));
});

app.post('/insertChat', (req, res) => {
  const {
    id_from,
    id_to,
    chat_id,
    from_fname,
    to_fname,
    msg,
    image_from,
    image_to,
  } = req.body;
  console.log(req.body);
  db('chats')
    .returning('*')
    .insert({
      id_from,
      id_to,
      chat_id,
      from_fname,
      to_fname,
      msg_creation_time: new Date(),
      msg,
      image_from,
      image_to,
    })
    .then((user) => res.json(user[0]))
    .catch((err) => res.status(400).json('Error'));
});

app.get('/getChats', (req, res) => {
  db.select('*')
    .from('chats')
    .orderBy('msg_creation_time', 'desc')
    .then((data) => {
      if (data.length) res.json(data);
      else res.status(400).json('error');
    })
    .catch((err) => res.status(400).json('error'));
});

app.post('/insertlike', (req, res) => {
  const { curr_user_id, post_owner_id, post_id } = req.body;
  console.log(req.body);
  db('likes')
    .returning('*')
    .insert({
      curr_user_id,
      post_owner_id,
      post_id,
    })
    .then((user) => res.json(user[0]))
    .catch((err) => res.status(400).json('Error'));
});

app.get('/getLikes', (req, res) => {
  console.log('HII');
  db.select('*')
    .from('likes')
    .then((data) => {
      if (data.length) res.json(data);
      else res.status(400).json('error');
    })
    .catch((err) => res.status(400).json('error'));
});

app.post('/deleteLike', (req, res) => {
  const { curr_user_id, post_owner_id, post_id } = req.body;
  console.log(req.body);
  db('likes')
    .returning('*')
    .where({
      curr_user_id,
      post_owner_id,
      post_id,
    })
    .del()
    .then((user) => res.json(user[0]))
    .catch((err) => res.status(400).json('Error'));
});

app.get('/', (req, res) => {
  console.log('HI');
  res.send('SUP');
});
// app.listen(process.env.PORT || 3001, (req, res) => {
//   console.log('HI');
//   res.send('SUP');
// });

app.listen(process.env.PORT || 3001);
