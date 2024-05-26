import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = 3000;

const db = new pg.Client({
  user: process.env.DATABASE_USER,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_DATABASE,
  password: process.env.DATABASE_PASSWORD,
  port: 5050,
});

db.connect();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

async function getBooks() {
  const result = await db.query("SELECT * FROM books ORDER BY id ASC");
  let books = [];
  result.rows.forEach((book) => {
    books.push(book);
  });
  return books;
}

app.get("/", async (req, res) => {
  const books = await getBooks();
  res.render("index.ejs", { books: books });
});

app.get("/create", async (req, res) => {
  res.render("create.ejs");
});

app.post("/create", async (req, res) => {
  const isbn = req.body.isbn.trim();
  const review = req.body.review;
  const rating = req.body.rating;

  try {
    const bookFound = await db.query("SELECT * FROM books WHERE isbn= $1 ;", [
      isbn,
    ]);

    if (bookFound.rows.length > 0) {
      res.render("create.ejs", {
        error: "Review of this book is already done.",
      });
    } else {
      const apiUrl = await axios.get(
        `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
      );

      const bookDetails = apiUrl.data[`ISBN:${isbn}`];

      if (bookDetails) {
        const title = bookDetails.title;
        const author = bookDetails.authors[0].name;
        const cover = bookDetails.cover.medium;
        const publication_date = bookDetails.publish_date;

        await db.query(
          "INSERT INTO books (isbn, title, author, cover, review, publication_date, rating) VALUES ($1, $2, $3, $4, $5, $6, $7) ;",
          [isbn, title, author, cover, review, publication_date, rating]
        );
        res.redirect("/");
      } else {
        res.render("create.ejs", {
          error: "No book found that matches your criteria",
        });
      }
    }
  } catch (error) {
    console.log(error);
    res.render("create.ejs", {
      error: "An error occured while processing your request.",
    });
  }
});

app.post("/sort", async (req, res) => {
  const option = req.body.select;
  try {
    if (option == "Recent") {
      const result = await db.query("SELECT * FROM books ORDER BY id DESC");
      const books = result.rows;
      res.render("index.ejs", { books: books, option: option });
    } else if (option == "Rating") {
      const result = await db.query("SELECT * FROM books ORDER BY rating DESC");
      const books = result.rows;
      res.render("index.ejs", { books: books, option: option });
    }
  } catch (error) {
    console.error("Error in sorting: ", error);
    res.redirect("/");
  }
});

app.post("/edit", async (req, res) => {
  const bookId = req.body.editBook;
  const result = await db.query(
    "SELECT review FROM books WHERE books.id = $1 ;",
    [bookId]
  );
  const details = result.rows[0];
  res.render("edit.ejs", {
    bookId: bookId,
    bookReview: details.review,
  });
});

app.post("/save", async (req, res) => {
  try {
    const bookId = req.body.editBook;
    const newReview = req.body.review;
    const newRating = req.body.rating;

    if (!newReview) {
      return res.status(400).send("New review cannot be empty");
    }

    await db.query(
      "UPDATE books SET review = $1, rating= $2 WHERE books.id = $3",
      [newReview, newRating, bookId]
    );
    res.redirect("/");
  } catch (error) {
    console.error("Error in /edited route:", error);
    res.status(500).send("Internal server error");
  }
});

app.post("/delete", async (req, res) => {
  const bookId = req.body.deleteBook;
  const result = await db.query("DELETE FROM books WHERE books.id = $1", [
    bookId,
  ]);
  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Running on server ${port}.`);
});

/*
https://openlibrary.org/dev/docs/api/covers

https://covers.openlibrary.org/b/isbn/0385472579-S.jpg

*/
