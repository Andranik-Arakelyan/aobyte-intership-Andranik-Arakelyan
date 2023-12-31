const express = require("express");

const { hash } = require("bcryptjs");
const { v4: generateId } = require("uuid");

const admin = require("firebase-admin");
const cors = require("cors");
const dotenv = require("dotenv");
const { Storage } = require("@google-cloud/storage");
const serviceAccount = require("./commentify-8218e-firebase-adminsdk-kez8r-e1a9c241dd.json");
const Multer = require("multer");

dotenv.config();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DB_URL,
  storageBucket: "commentify-8218e.appspot.com",
});

const db = admin.database();

const storage = new Storage({
  projectId: "commentify-8218e",
  keyFilename: "./commentify-8218e-firebase-adminsdk-kez8r-e1a9c241dd.json",
});

const app = express();
const PORT = process.env.PORT;

const bucket = storage.bucket("commentify-8218e.appspot.com");

const upload = Multer({
  storage: Multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

app.use(express.json());
app.use(cors());

// api which gets all posts from firebase
app.get("/api/posts", (req, res) => {
  db.ref("posts")
    .once("value")
    .then((snapshot) => {
      res.json(snapshot.val());
    })
    .catch((error) => {
      res.status(500).json({ error: "Error fetching posts" });
    });
});

//api which gets specific post from firebase
app.get("/api/posts/:postId", (req, res) => {
  const { postId } = req.params;
  db.ref("posts")
    .child(postId)
    .once("value")
    .then((snapshot) => {
      res.json(snapshot.val());
    })
    .catch((error) => {
      res.status(500).json({ error: "Error adding post" });
    });
});

//api which posts new post to firebase
app.post("/api/posts", upload.single("image"), async (req, res) => {
  try {
    const { title, description } = req.body;
    const image = req.file;

    if (!image) {
      res.status(400).json({ error: "No image file provided." });
      return;
    }

    const imageRef = bucket.file(`images/${image.originalname}`);

    await imageRef.save(image.buffer, {
      metadata: {
        contentType: image.mimetype,
        cacheControl: "public, max-age=31536000",
      },
    });
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${imageRef.name}`;

    const postsSnapshot = await db.ref("posts").once("value");
    const posts = postsSnapshot.val() || [];

    const index = Object.keys(posts).length;
    const newPost = {
      id: index.toString(),
      title,
      description,
      imageUrl: publicUrl,
      comments: "",
    };

    await db.ref("posts").child(index).set(newPost);
    res.json(newPost);
  } catch (error) {
    console.error("Error uploading image to Firebase Storage:", error);
    res
      .status(500)
      .json({ error: "An error occurred while uploading the image." });
  }
});

// api which creates comment in specific post
app.post("/api/posts/:postId/comments", (req, res) => {
  const { postId } = req.params;
  const { comment, rating } = req.body;
  const newComment = {
    id: `comment${Date.now()}`,
    comment,
    rating,
  };

  db.ref("posts")
    .child(postId)
    .once("value")
    .then((snapshot) => {
      const postData = snapshot.val();
      if (!postData) {
        return res.status(404).json({ error: "Post not found" });
      }

      postData.comments = postData.comments || [];

      postData.comments.push(newComment);

      db.ref("posts")
        .child(postId)
        .update({ comments: postData.comments })
        .then(() => {
          res.json(newComment);
        })
        .catch((error) => {
          res.status(500).json({ error: "Error adding comment" });
        });
    })
    .catch((error) => {
      res.status(500).json({ error: "Error fetching post data" });
    });
});

//api which deletes comment
app.delete("/api/posts/:postId/comments/:commentId", (req, res) => {
  const { postId, commentId } = req.params;
  db.ref("posts")
    .child(postId)
    .once("value")
    .then((snapshot) => {
      const post = snapshot.val();
      const filteredComments = post.comments.filter((comment) => {
        return comment.id !== commentId;
      });
      if (post) {
        db.ref("posts")
          .child(postId)
          .update({ comments: filteredComments.length ? filteredComments : "" })
          .then(() => {
            res.json(filteredComments);
          })
          .catch((error) => {
            res.status(500).json({ error: "Error adding comment" });
          });
      } else {
        res.status(404).json({ error: "Post not found" });
      }
    });
});

// api which creates new user
async function addUser(data) {
  const usersSnapshot = await db.ref("users").once("value");
  const users = usersSnapshot.val() || [];

  const index = Object.keys(users).length;
  const hashedPw = await hash(data.password, 12);
  const newUser = {
    ...data,
    id: generateId(),
    password: hashedPw,
  };

  await db.ref("users").child(index).set(newUser);
  return { id: newUser.id, email: data.email };
}

app.listen(PORT, () => {
  console.log(`Server listening on PORT ${PORT}`);
});
