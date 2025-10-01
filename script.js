// Shared script for login, register, and todos pages
const SERVER_URL = "http://localhost:8080";

// Always read token at call-time (so it updates after login)
function getToken() {
  return localStorage.getItem("token");
}

/* -------------------------
   Helpers for error handling
   ------------------------- */
async function extractErrorMessage(response) {
  // try JSON, then text, then statusText
  try {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      return data && data.message ? data.message : JSON.stringify(data);
    }
    const text = await response.text();
    if (text) return text;
  } catch (e) {
    // ignore parse errors
  }
  return response.statusText || "Request failed";
}

/* -------------------------
   Login
   ------------------------- */
async function login(event) {
  if (event) event.preventDefault();
  const email = (document.getElementById("email")?.value || "").trim();
  const password = document.getElementById("password")?.value || "";

  try {
    const res = await fetch(`${SERVER_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const msg = await extractErrorMessage(res);
      throw new Error(msg || "Login failed");
    }

    const data = await res.json();
    if (!data || !data.token) throw new Error("No token returned from server");
    localStorage.setItem("token", data.token);
    window.location.href = "todos.html";
  } catch (err) {
    alert(err.message);
  }
}

/* -------------------------
   Register
   ------------------------- */
async function register(event) {
  if (event) event.preventDefault();
  const email = (document.getElementById("email")?.value || "").trim();
  const password = document.getElementById("password")?.value || "";

  try {
    const res = await fetch(`${SERVER_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const msg = await extractErrorMessage(res);
      throw new Error(msg || "Registration failed");
    }

    alert("Registration successful. Please login.");
    window.location.href = "login.html";
  } catch (err) {
    alert(err.message);
  }
}

/* -------------------------
   Todos UI helpers
   ------------------------- */
function createTodoCard(todo) {
  const card = document.createElement("div");
  card.className = "todo-card";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = !!todo.isCompleted;
  checkbox.addEventListener("change", function () {
    const updatedTodo = { ...todo, isCompleted: checkbox.checked };
    updateTodoStatus(updatedTodo);
  });

  const span = document.createElement("span");
  span.textContent = todo.title || "(no title)";
  if (todo.isCompleted) {
    span.style.textDecoration = "line-through";
    span.style.color = "#aaa";
  }

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "X";
  deleteBtn.addEventListener("click", function () {
    const id = todo.id || todo._id || todo.todoId;
    deleteTodo(id);
  });

  card.appendChild(checkbox);
  card.appendChild(span);
  card.appendChild(deleteBtn);

  return card;
}

/* -------------------------
   Load todos
   ------------------------- */
async function loadTodos() {
  const token = getToken();
  if (!token) {
    alert("Please login first");
    window.location.href = "login.html";
    return;
  }

  try {
    const res = await fetch(`${SERVER_URL}/todo`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const msg = await extractErrorMessage(res);
      throw new Error(msg || "Failed to get todos");
    }

    const todos = await res.json();
    const todoList = document.getElementById("todo-list");
    if (!todoList) return;

    todoList.innerHTML = "";
    if (!todos || todos.length === 0) {
      todoList.innerHTML = `<p id="empty-message">No todos yet. Add one below.</p>`;
    } else {
      todos.forEach((t) => todoList.appendChild(createTodoCard(t)));
    }
  } catch (err) {
    alert(err.message);
    const todoList = document.getElementById("todo-list");
    if (todoList) todoList.innerHTML = `<p style="color: red">failed to load todos</p>`;
  }
}

/* -------------------------
   Add todo
   ------------------------- */
async function addTodo(event) {
  if (event) event.preventDefault();
  const inputEl = document.getElementById("new-todo");
  if (!inputEl) return;
  const todoText = (inputEl.value || "").trim();
  if (!todoText) {
    alert("Please enter a todo.");
    return;
  }

  const token = getToken();
  try {
    const res = await fetch(`${SERVER_URL}/todo/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title: todoText, isCompleted: false }),
    });

    if (!res.ok) {
      const msg = await extractErrorMessage(res);
      throw new Error(msg || "Failed to create todo");
    }

    inputEl.value = "";
    await loadTodos();
  } catch (err) {
    alert(err.message);
  }
}

/* -------------------------
   Update todo
   ------------------------- */
async function updateTodoStatus(todo) {
  const token = getToken();
  const id = todo.id || todo._id || null;
  const url = id ? `${SERVER_URL}/todo/${id}` : `${SERVER_URL}/todo`;

  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(todo),
    });

    if (!res.ok) {
      const msg = await extractErrorMessage(res);
      throw new Error(msg || "Failed to update todo");
    }

    await loadTodos();
  } catch (err) {
    alert(err.message);
  }
}

/* -------------------------
   Delete todo
   ------------------------- */
async function deleteTodo(id) {
  if (!id) {
    alert("Missing todo id");
    return;
  }
  const token = getToken();
  try {
    const res = await fetch(`${SERVER_URL}/todo/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const msg = await extractErrorMessage(res);
      throw new Error(msg || "Failed to delete todo");
    }

    await loadTodos();
  } catch (err) {
    alert(err.message);
  }
}

/* -------------------------
   Page init
   ------------------------- */
document.addEventListener("DOMContentLoaded", function () {
  // If there's a todo list element on the page, load todos
  if (document.getElementById("todo-list")) {
    loadTodos();
  }

  // Attach handlers if the pages have forms/buttons
  const loginForm = document.getElementById("login-form");
  if (loginForm) loginForm.addEventListener("submit", login);

  const registerForm = document.getElementById("register-form");
  if (registerForm) registerForm.addEventListener("submit", register);

  const addTodoForm = document.getElementById("add-todo-form");
  if (addTodoForm) addTodoForm.addEventListener("submit", addTodo);
  // fallback: button with id "add-btn"
  const addBtn = document.getElementById("add-btn");
  if (addBtn) addBtn.addEventListener("click", addTodo);
});
