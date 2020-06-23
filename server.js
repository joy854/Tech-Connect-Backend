const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cors = require('cors');
require('dotenv').config();
const app = express();
const jwt = require('jsonwebtoken');
app.use(cors());
app.use(bodyParser.json());

// const isProduction = process.env.NODE_ENV === 'production';
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
const PORT = process.env.PORT || 3001;
// db.select('*')
//   .from('users')
//   .then((rows) => console.log(rows));

function verifyToken(req, res, next) {
  // Get auth header value
  const bearerHeader = req.headers['authorization'];
  // Check if bearer is undefined
  if (typeof bearerHeader !== 'undefined') {
    // Split at the space
    const bearer = bearerHeader.split(' ');
    // Get token from array
    const bearerToken = bearer[1];
    // Set the token
    req.token = bearerToken;
    // Next middleware
    next();
  } else {
    // Forbidden
    res.sendStatus(403);
  }
}
app.post('/storeSkill', (req, res) => {
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

app.get('/getSkills', verifyToken, (req, res) => {
  jwt.verify(req.token, 'secretkey', (err, authData) => {
    if (err) res.sendStatus(403);
    else {
      db.select('*')
        .from('skills')
        .then((data) => {
          if (data.length) res.json(data);
          else res.status(400).json('error');
        })
        .catch((err) => res.status(400).json('error'));
    }
  });
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
  // jwt.sign({user}, 'secretkey', { expiresIn: '30s' }, (err, token) => {
  //   res.json({
  //     token
  //   });
  // });
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
  // console.log('hi');
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
            jwt.sign({ user }, 'secretkey', (err, token) => {
              res.json({
                token,
                user,
              });
            });
          })
          .catch((err) => res.status(400).json('unable to get user'));
      } else {
        res.status(400).json('wrong credentials');
      }
    })
    .catch((err) => res.status(400).json('wrong credentials'));
});

app.post('/getDetails', verifyToken, (req, res) => {
  const { userid } = req.body;
  console.log(req.body);
  jwt.verify(req.token, 'secretkey', (err, authData) => {
    if (err) {
      res.sendStatus(403);
    } else {
      db.select('*')
        .from('users')
        .where('id', '=', userid)
        .then((data) => {
          if (data.length) res.json(data[0]);
          else res.status(400).json('error');
        })
        .catch((err) => res.status(400).json('error'));
    }
  });
});

app.post('/insertPost', verifyToken, (req, res) => {
  const { text, url, id, post_id } = req.body;
  jwt.verify(req.token, 'secretkey', (err, authData) => {
    if (err) {
      res.sendStatus(403);
    } else {
      // res.json({
      //   message: 'Post created...',
      //   authData,
      // });
      console.log('hi');
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
    }
  });
});
app.post('/getUserFromToken', (req, res) => {
  const { usertoken } = req.body;
  jwt.verify(usertoken, 'secretkey', (err, data) => {
    if (err) res.sendStatus(403);
    else res.json(data.user[0]);
  });
});
app.post('/deletePost', verifyToken, (req, res) => {
  const { id, postid } = req.body;
  console.log(req.body);
  jwt.verify(req.token, 'secretkey', (err, authData) => {
    if (err) res.sendStatus(403);
    else {
      db('posts')
        .returning('*')
        .where({
          id,
          post_id: postid,
        })
        .del()
        .then((user) => res.json(user[0]))
        .catch((err) => res.status(400).json('Error'));
    }
  });
});

app.post('/getPosts', verifyToken, (req, res) => {
  const { userid } = req.body;
  console.log('getposts', userid);
  jwt.verify(req.token, 'secretkey', (err, authData) => {
    if (err) res.sendStatus(403);
    else {
      var subquery = db
        .select('to_id')
        .from('follows')
        .where('from_id', userid);
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
    }
  });
  // var subquery = db('users')
  //   .join('follows', userid, '=', 'follows.from_id')
  //   .select('follows.to_id');
});

app.post('/users/:id', verifyToken, (req, res) => {
  const id = req.params.id;
  // console.log(req.body);
  jwt.verify(req.token, 'secretkey', (err, authData) => {
    if (err) res.sendStatus(403);
    else {
      db.select('*')
        .from('users')
        .where('id', '=', id)
        .then((data) => {
          if (data.length) res.json(data[0]);
          else res.status(400).json('Profile Does not exist!');
        })
        .catch((err) => res.status(400).json('error'));
    }
  });
});

app.get('/users', verifyToken, (req, res) => {
  jwt.verify(req.token, 'secretkey', (err, authData) => {
    if (err) res.sendStatus(403);
    else {
      db.select('*')
        .from('users')
        .orderBy('id')
        .then((data) => {
          if (data.length) res.json(data);
          else res.status(404).json('Not found');
        })
        .catch((err) => {
          console.log(err);
          res.status(500).json('Internal server error');
        });
    }
  });
});

app.get('/getFollowers', verifyToken, (req, res) => {
  jwt.verify(req.token, 'secretkey', (err, authData) => {
    if (err) res.sendStatus(403);
    else {
      db.select('*')
        .from('follows')
        .then((data) => {
          if (data.length) res.json(data);
          else res.status(404).json('error');
        })
        .catch((err) => res.status(400).json('error'));
    }
  });
});

app.post('/insertFollowers', verifyToken, (req, res) => {
  const { from_id, to_id } = req.body;
  console.log(req.body);
  jwt.verify(req.token, 'secretkey', (err, authData) => {
    if (err) res.sendStatus(403);
    else {
      db('follows')
        .returning('*')
        .insert({
          from_id,
          to_id,
        })
        .then((user) => res.json(user[0]))
        .catch((err) => res.status(400).json('Error'));
    }
  });
});

app.post('/deleteFollowers', verifyToken, (req, res) => {
  const { from_id, to_id } = req.body;
  console.log(req.body);
  jwt.verify(req.token, 'secretkey', (err, authData) => {
    if (err) res.sendStatus(403);
    else {
      db('follows')
        .returning('*')
        .where({
          from_id,
          to_id,
        })
        .del()
        .then((user) => res.json(user[0]))
        .catch((err) => res.status(400).json('Error'));
    }
  });
});

app.post('/insertComment', verifyToken, (req, res) => {
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
  jwt.verify(req.token, 'secretkey', (err, authData) => {
    if (err) res.sendStatus(403);
    else {
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
    }
  });
});

app.post('/deleteComment', verifyToken, (req, res) => {
  const { id, comment_id, post_id } = req.body;
  console.log(req.body);
  jwt.verify(req.token, 'secretkey', (err, authData) => {
    if (err) res.sendStatus(403);
    else {
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
    }
  });
});

app.post('/getComments', verifyToken, (req, res) => {
  const { userid } = req.body;
  console.log('getcomments', userid);
  jwt.verify(req.token, 'secretkey', (err, authData) => {
    if (err) res.sendStatus(403);
    else {
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
    }
  });
});

app.post('/insertChat', verifyToken, (req, res) => {
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
  jwt.verify(req.token, 'secretkey', (err, authData) => {
    if (err) res.sendStatus(403);
    else {
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
    }
  });
});

app.get('/getChats', verifyToken, (req, res) => {
  jwt.verify(req.token, 'secretkey', (err, authData) => {
    if (err) res.sendStatus(403);
    else {
      db.select('*')
        .from('chats')
        .orderBy('msg_creation_time', 'desc')
        .then((data) => {
          if (data.length) res.json(data);
          else res.status(400).json('error');
        })
        .catch((err) => res.status(400).json('error'));
    }
  });
});

app.post('/insertlike', verifyToken, (req, res) => {
  const { curr_user_id, post_owner_id, post_id } = req.body;
  console.log(req.body);
  jwt.verify(req.token, 'secretkey', (err, authData) => {
    if (err) res.sendStatus(403);
    else {
      db('likes')
        .returning('*')
        .insert({
          curr_user_id,
          post_owner_id,
          post_id,
        })
        .then((user) => res.json(user[0]))
        .catch((err) => res.status(400).json('Error'));
    }
  });
});

app.get('/getLikes', verifyToken, (req, res) => {
  // console.log('HII');
  jwt.verify(req.token, 'secretkey', (err, authData) => {
    if (err) res.sendStatus(403);
    else {
      db.select('*')
        .from('likes')
        .then((data) => {
          if (data.length) res.json(data);
          else res.status(400).json('error');
        })
        .catch((err) => res.status(400).json('error'));
    }
  });
});

app.post('/deleteLike', verifyToken, (req, res) => {
  const { curr_user_id, post_owner_id, post_id } = req.body;
  console.log(req.body);
  jwt.verify(req.token, 'secretkey', (err, authData) => {
    if (err) res.sendStatus(403);
    else {
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
    }
  });
});

// app.get('/', (req, res) => {
//   // console.log(connectionString);
//   res.send(`${PORT}     ${process.env.DATABASE_URL}`);
// });

app.listen(PORT);
