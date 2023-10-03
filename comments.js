// Create web server

const express = require('express');
const bodyParser = require('body-parser');
const { randomBytes } = require('crypto');
const cors = require('cors');
const axios = require('axios');

// Create express server
const app = express();

// Add body parser middleware
app.use(bodyParser.json());

// Add cors middleware
app.use(cors());

// Comments object to store all the comments
const commentsByPostId = {};

// Route to get all the comments for a post
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

// Route to create a new comment
app.post('/posts/:id/comments', async (req, res) => {
  // Create a new comment id
  const commentId = randomBytes(4).toString('hex');

  // Get the post id from the url
  const { id } = req.params;

  // Get the comment content from the request body
  const { content } = req.body;

  // Get the comments for the post id
  const comments = commentsByPostId[id] || [];

  // Add the new comment to the comments array
  comments.push({ id: commentId, content, status: 'pending' });

  // Push the updated comments array to the commentsByPostId object
  commentsByPostId[id] = comments;

  // Emit an event to the event bus
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: { id: commentId, content, postId: id, status: 'pending' },
  });

  // Send the updated comments array
  res.status(201).send(comments);
});

// Route to handle events from the event bus
app.post('/events', async (req, res) => {
  console.log('Received event', req.body.type);

  // Get the event data
  const { type, data } = req.body;

  // Check if the event type is CommentModerated
  if (type === 'CommentModerated') {
    // Get the post id and comment id
    const { postId, id, status, content } = data;

    // Get the comments for the post id
    const comments = commentsByPostId[postId];

    // Find the comment with the comment id
    const comment = comments