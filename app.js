const express = require('express');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, 'todoApplication.db');

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    // Creating todo table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS todo (
        id INTEGER PRIMARY KEY,
        todo TEXT,
        priority TEXT CHECK(priority IN ('HIGH', 'MEDIUM', 'LOW')),
        status TEXT CHECK(status IN ('TO DO', 'IN PROGRESS', 'DONE'))
      );
    `);

    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/');
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

// Get all todos
app.get('/todos', async (request, response) => {
  const { status, priority, search_q } = request.query;

  let query = 'SELECT * FROM todo';
  const queryParams = [];

  if (status) {
    queryParams.push(`status = '${status}'`);
  }

  if (priority) {
    queryParams.push(`priority = '${priority}'`);
  }

  if (search_q) {
    queryParams.push(`todo LIKE '%${search_q}%'`);
  }

  if (queryParams.length > 0) {
    query += ' WHERE ' + queryParams.join(' AND ');
  }

  const todos = await db.all(query);
  response.json(todos);
});

// Get a specific todo by ID
app.get('/todos/:todoId', async (request, response) => {
  const { todoId } = request.params;
  const query = `SELECT * FROM todo WHERE id = ${todoId};`;
  const todo = await db.get(query);
  response.json(todo);
});

// Add a new todo
app.post('/todos', async (request, response) => {
  const { todo, priority, status } = request.body;
  const query = `
    INSERT INTO todo (todo, priority, status)
    VALUES ('${todo}', '${priority}', '${status}');
  `;
  await db.run(query);
  response.send('Todo Successfully Added');
});

// Update todo by ID
app.put('/todos/:todoId', async (request, response) => {
  const { todo, priority, status } = request.body;
  const { todoId } = request.params;

  let updateFields = [];
  if (todo) {
    updateFields.push(`todo = '${todo}'`);
  }
  if (priority) {
    updateFields.push(`priority = '${priority}'`);
  }
  if (status) {
    updateFields.push(`status = '${status}'`);
  }

  const query = `
    UPDATE todo
    SET ${updateFields.join(', ')}
    WHERE id = ${todoId};
  `;
  await db.run(query);

  if (status) {
    response.send('Status Updated');
  } else if (priority) {
    response.send('Priority Updated');
  } else if (todo) {
    response.send('Todo Updated');
  }
});

// Delete todo by ID
app.delete('/todos/:todoId', async (request, response) => {
  const { todoId } = request.params;
  const query = `DELETE FROM todo WHERE id = ${todoId};`;
  await db.run(query);
  response.send('Todo Deleted');
});

module.exports = app;
