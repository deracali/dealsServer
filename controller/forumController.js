import mongoose from "mongoose";
import ForumPost from "../model/ForumSchema.js";

// ========== CREATE ==========
export const createPost = async (req, res) => {
  try {
    const { title, content, type, tags, reportedScamUrl, relatedDealId, author } = req.body;

    if (!author?.name) {
      return res.status(400).json({ message: "Author name is required." });
    }

    const post = new ForumPost({
      title,
      content,
      type,
      tags,
      reportedScamUrl,
      relatedDealId,
      author: {
        name: author.name,
        photo: author.photo || "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg",
        isVerified: author.isVerified ?? false,
        reputation: author.reputation ?? 0,
      },
    });

    await post.save();
    res.status(201).json({ data: post });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};



// ========== READ ==========
export const getPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", type, tags } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (tags) filter.tags = { $in: tags.split(",") };
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    const posts = await ForumPost.find(filter)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 })
      .lean();

    const count = await ForumPost.countDocuments(filter);

    res.json({
      data: posts,
      total: count,
      page: Number(page),
      pages: Math.ceil(count / limit),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};





export const getPostById = async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // increment views
    post.views += 1;
    await post.save();

    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ========== UPDATE ==========
export const updatePost = async (req, res) => {
  try {
    const post = await ForumPost.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ========== DELETE ==========
export const deletePost = async (req, res) => {
  try {
    const post = await ForumPost.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ========== COMMENTS ==========
export const addComment = async (req, res) => {
  try {
    const { id: postId } = req.params;
    const { content, author, parentCommentId } = req.body;

    if (!content || !author?.name) {
      return res.status(400).json({ message: "Content and author name required" });
    }

    let parentId = null;
    if (parentCommentId && parentCommentId !== "0") {
      if (!mongoose.Types.ObjectId.isValid(parentCommentId)) {
        return res.status(400).json({ message: "Invalid parentCommentId" });
      }
      parentId = parentCommentId;
    }

    const post = await ForumPost.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const newComment = {
      author: {
        userId: author.userId || null,
        name: author.name,
        photo: author.photo || "",
        isVerified: !!author.isVerified,
        reputation: author.reputation || 0,
      },
      content,
      parentCommentId: parentId,
      likes: 0,
      dislikes: 0,
      hasUserLiked: [],
      hasUserDisliked: [],
      date: new Date(),
    };

    post.comments.push(newComment);
    await post.save();

    res.status(201).json(newComment);
  } catch (err) {
    console.error("Add forum comment error:", err);
    res.status(500).json({ message: "Failed to add comment" });
  }
};



const buildNestedComments = (flatComments) => {
  const map = {};
  const roots = [];

  flatComments.forEach(c => {
    const id = c._id.toString();
    map[id] = {
      ...c,
      _id: id,
      parentCommentId: c.parentCommentId
        ? c.parentCommentId.toString()
        : null,
      replies: [],
    };
  });

  Object.values(map).forEach(c => {
    if (c.parentCommentId && map[c.parentCommentId]) {
      map[c.parentCommentId].replies.push(c);
    } else {
      roots.push(c);
    }
  });

  const sortByDate = arr => {
    arr.sort((a, b) => new Date(a.date) - new Date(b.date));
    arr.forEach(i => sortByDate(i.replies));
  };

  sortByDate(roots);
  return roots;
};





export const getComment = async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id).lean();
    if (!post) return res.status(404).json({ message: "Post not found" });

    const nested = buildNestedComments(
      post.comments.map(c => ({
        _id: c._id,
        author: c.author,
        content: c.content,
        parentCommentId: c.parentCommentId,
        date: c.date,
        likes: c.likes || 0,
        dislikes: c.dislikes || 0,
        hasUserLiked: c.hasUserLiked || [],
        hasUserDisliked: c.hasUserDisliked || [],
      }))
    );

    res.json(nested);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const likePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = String(req.body.userId);

    const post = await ForumPost.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Normalize stored arrays to string
    post.hasUserLiked = (post.hasUserLiked || []).map(String);
    post.hasUserDisliked = (post.hasUserDisliked || []).map(String);

    const alreadyLiked = post.hasUserLiked.includes(userId);
    const alreadyDisliked = post.hasUserDisliked.includes(userId);

    if (alreadyLiked) {
      // remove like (toggle off)
      post.hasUserLiked = post.hasUserLiked.filter(u => u !== userId);
    } else {
      // add like
      post.hasUserLiked.push(userId);

      // remove from dislikes if previously disliked
      if (alreadyDisliked) {
        post.hasUserDisliked = post.hasUserDisliked.filter(u => u !== userId);
      }
    }

    // recalc counts
    post.likes = post.hasUserLiked.length;
    post.dislikes = post.hasUserDisliked.length;

    await post.save();
    return res.json(post);
  } catch (err) {
    console.error("likePost error:", err);
    return res.status(500).json({ message: err.message });
  }
};

export const dislikePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = String(req.body.userId);

    const post = await ForumPost.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    post.hasUserLiked = (post.hasUserLiked || []).map(String);
    post.hasUserDisliked = (post.hasUserDisliked || []).map(String);

    const alreadyLiked = post.hasUserLiked.includes(userId);
    const alreadyDisliked = post.hasUserDisliked.includes(userId);

    if (alreadyDisliked) {
      // remove dislike (toggle off)
      post.hasUserDisliked = post.hasUserDisliked.filter(u => u !== userId);
    } else {
      // add dislike
      post.hasUserDisliked.push(userId);

      // remove from likes if previously liked
      if (alreadyLiked) {
        post.hasUserLiked = post.hasUserLiked.filter(u => u !== userId);
      }
    }

    // recalc counts
    post.likes = post.hasUserLiked.length;
    post.dislikes = post.hasUserDisliked.length;

    await post.save();
    return res.json(post);
  } catch (err) {
    console.error("dislikePost error:", err);
    return res.status(500).json({ message: err.message });
  }
};


export const likeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { userId } = req.body;

    const post = await ForumPost.findOne({ "comments._id": commentId });
    if (!post) return res.status(404).json({ message: "Comment not found" });

    const comment = post.comments.id(commentId);

    comment.hasUserLiked ||= [];
    comment.hasUserDisliked ||= [];

    const liked = comment.hasUserLiked.includes(userId);
    const disliked = comment.hasUserDisliked.includes(userId);

    if (liked) {
      comment.hasUserLiked.pull(userId);
    } else {
      comment.hasUserLiked.push(userId);
      if (disliked) comment.hasUserDisliked.pull(userId);
    }

    comment.likes = comment.hasUserLiked.length;
    comment.dislikes = comment.hasUserDisliked.length;

    await post.save();
    res.json(comment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



export const dislikeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { userId } = req.body;

    const post = await ForumPost.findOne({ "comments._id": commentId });
    if (!post) return res.status(404).json({ message: "Comment not found" });

    const comment = post.comments.id(commentId);

    comment.hasUserLiked ||= [];
    comment.hasUserDisliked ||= [];

    const disliked = comment.hasUserDisliked.includes(userId);
    const liked = comment.hasUserLiked.includes(userId);

    if (disliked) {
      comment.hasUserDisliked.pull(userId);
    } else {
      comment.hasUserDisliked.push(userId);
      if (liked) comment.hasUserLiked.pull(userId);
    }

    comment.likes = comment.hasUserLiked.length;
    comment.dislikes = comment.hasUserDisliked.length;

    await post.save();
    res.json(comment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// ========== REPORT ==========
export const reportPost = async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const { reason } = req.body; // expect { reason: "..." } from frontend

    post.isReported = true;
    post.reportReason = reason || "No reason provided";
    await post.save();

    res.json({ message: "Post reported", reportReason: post.reportReason });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const reportComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const post = await ForumPost.findOne({ "comments._id": commentId });
    if (!post) return res.status(404).json({ message: "Comment not found" });

    const comment = post.comments.id(commentId);
    comment.isReported = true;

    await post.save();
    res.json({ message: "Comment reported" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// Increment view count
export const incrementView = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Forum.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },   // increase views by 1
      { new: true }
    );
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
