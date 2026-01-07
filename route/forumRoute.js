import express from "express";
import {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
  likePost,
  dislikePost,
  addComment,
  getComment,
  reportPost,
  incrementView,
  likeComment,
  dislikeComment
} from "../controller/forumController.js";

const forumRoute = express.Router();

// CRUD
forumRoute.post("/create", createPost);
forumRoute.get("/get", getPosts);
forumRoute.get("/get-by-id/:id", getPostById);
forumRoute.put("/update/:id", updatePost);
forumRoute.delete("/delete/:id", deletePost);

// Interactions
forumRoute.post("/:id/like", likePost);
forumRoute.post("/:id/dislike", dislikePost);
forumRoute.post("/:id/comments", addComment);
forumRoute.get("/:id/comments", getComment);
forumRoute.post("/:id/report", reportPost);
forumRoute.post( "/:postId/comments/:commentId/like",likeComment);
forumRoute.post("/:postId/comments/:commentId/dislike",dislikeComment);
// Views
forumRoute.patch("/:id/view", incrementView);

export default forumRoute;
