import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Getboards.css";

const GetBoards = ({ token }) => {
  const [ownerBoards, setOwnerBoards] = useState([]);
  const [memberBoards, setMemberBoards] = useState([]);
  const [columns, setColumns] = useState([]);
  const [selectedBoardId, setSelectedBoardId] = useState(null);
  const [selectedColumnId, setSelectedColumnId] = useState(null); // เพิ่ม state เพื่อเลือก Column
  const [error, setError] = useState("");
  const [editingBoardId, setEditingBoardId] = useState(null);
  const [editedName, setEditedName] = useState("");
  const [newColumnName, setNewColumnName] = useState("");
  const [editedColumnName, setEditedColumnName] = useState("");
  const [editingColumnId, setEditingColumnId] = useState(null);
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [newTaskColumnId, setNewTaskColumnId] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editedTaskTitle, setEditedTaskTitle] = useState("");
  const [editedTaskDescription, setEditedTaskDescription] = useState("");

  const [boardMembers, setBoardMembers] = useState([]);
  const [assignTaskId, setAssignTaskId] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isReordering, setIsReordering] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate("/login");
    } else {
      fetchOwnerBoards(token);
      fetchMemberBoards(token);
    }
  }, [token, navigate]);

  // Fetch owner boards
  const fetchOwnerBoards = (token) => {
    axios
      .get("http://localhost:3333/api/boards/owner", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        setOwnerBoards(response.data);
        setError("");
      })
      .catch((error) => {
        setError(error.response?.data?.message || "Error fetching owner boards");
        console.error(error);
      });
  };

  // Fetch member boards
  const fetchMemberBoards = (token) => {
    axios
      .get("http://localhost:3333/api/boards/member", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        setMemberBoards(response.data);
        setError("");
      })
      .catch((error) => {
        setError(error.response?.data?.message || "Error fetching member boards");
        console.error(error);
      });
  };

  // Fetch columns
  const fetchColumns = (boardId) => {
    if (!token) {
      setError("You must be logged in to view columns");
      return;
    }
    axios
      .get(`http://localhost:3333/api/boards/${boardId}/columns`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        if (Array.isArray(response.data)) {
          setColumns(response.data.map((col) => ({ ...col, tasks: col.tasks || [] })));
          setError("");
        } else {
          setColumns([]);
          setError("No columns found for this board");
        }
      })
      .catch((error) => {
        if (error.response && error.response.status === 404) {
          setColumns([]);
          setError("");
        } else {
          setError(error.response?.data?.message || "Error fetching columns");
          console.error(error);
        }
      });
  };

  // Fetch tasks with callback, sort by order
  const fetchTasks = (columnId, callback) => {
    if (!token) {
      setError("You must be logged in to view tasks");
      return;
    }
    axios
      .get(`http://localhost:3333/api/columns/${columnId}/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        const sortedTasks = response.data.sort((a, b) => (a.order || 0) - (b.order || 0));
        callback(columnId, sortedTasks);
        setError("");
      })
      .catch((error) => {
        setError(error.response?.data?.message || "Error fetching tasks");
        console.error(error);
      });
  };

  // Fetch board members
  const fetchBoardMembers = (boardId) => {
    axios
      .get(`http://localhost:3333/api/boards/${boardId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        setBoardMembers(response.data);
        setError("");
      })
      .catch((error) => {
        setError(error.response?.data?.message || "Error fetching board members");
        console.error(error);
      });
  };

  // Assign task
  const handleAssignTask = (taskId) => {
    if (!token) {
      setError("You must be logged in to assign a task");
      return;
    }
    if (!selectedUserId) {
      setError("Please select a user to assign the task to");
      return;
    }
    axios
      .post(
        `http://localhost:3333/api/tasks/${taskId}/assign`,
        { assignedUserId: parseInt(selectedUserId) },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then(() => {
        if (selectedColumnId) fetchTasks(selectedColumnId, updateTasksInColumn);
        setAssignTaskId(null);
        setSelectedUserId("");
        setError("");
      })
      .catch((error) => {
        setError(error.response?.data?.message || "Error assigning task");
        console.error(error);
      });
  };

  // Edit board name
  const handleEditBoard = (boardId, name) => {
    setEditingBoardId(boardId);
    setEditedName(name);
  };

  // Save edited board name
  const handleSaveEdit = (boardId) => {
    if (!token) {
      setError("You must be logged in to update the board");
      return;
    }
    axios
      .put(
        `http://localhost:3333/api/boards/${boardId}`,
        { name: editedName },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then(() => {
        setOwnerBoards(
          ownerBoards.map((board) =>
            board.id === boardId ? { ...board, name: editedName } : board
          )
        );
        setEditingBoardId(null);
        setError("");
      })
      .catch((error) => {
        setError(error.response?.data?.message || "Error updating board");
        console.error(error);
      });
  };

  // Delete board
  const handleDeleteBoard = (boardId) => {
    if (!token) {
      setError("You must be logged in to delete the board");
      return;
    }
    axios
      .delete(`http://localhost:3333/api/boards/${boardId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => {
        setOwnerBoards(ownerBoards.filter((board) => board.id !== boardId));
        setSelectedBoardId(null);
        setColumns([]);
        setError("");
      })
      .catch((error) => {
        setError(error.response?.data?.message || "Error deleting board");
        console.error(error);
      });
  };

  // Select board
  const handleBoardClick = (boardId) => {
    setSelectedBoardId(boardId);
    setSelectedColumnId(null); // รีเซ็ต Column ที่เลือก
    fetchColumns(boardId);
    fetchBoardMembers(boardId);
  };

  // Add column and refresh data
  const handleAddColumn = () => {
    if (!newColumnName.trim()) {
      setError("Column name is required");
      return;
    }
    if (!selectedBoardId) {
      setError("Please select a board to add a column to.");
      return;
    }
    if (!token) {
      setError("You must be logged in to add a column");
      return;
    }
    axios
      .post(
        `http://localhost:3333/api/boards/${selectedBoardId}/columns/create`,
        { name: newColumnName },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then(() => {
        fetchColumns(selectedBoardId);
        setNewColumnName("");
        setIsAddColumnOpen(false);
        setError("");
      })
      .catch((error) => {
        setError(error.response?.data?.message || "Error adding column");
        console.error(error);
      });
  };

  // Edit column name
  const handleEditColumn = (columnId, name) => {
    setEditingColumnId(columnId);
    setEditedColumnName(name);
  };

  // Save edited column name
  const handleSaveColumnEdit = (columnId) => {
    if (!token) {
      setError("You must be logged in to update the column");
      return;
    }
    if (!editedColumnName.trim()) {
      setError("Column name cannot be empty");
      return;
    }
    axios
      .put(
        `http://localhost:3333/api/columns/${columnId}`,
        { name: editedColumnName },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then(() => {
        setColumns(
          columns.map((column) =>
            column.id === columnId ? { ...column, name: editedColumnName } : column
          )
        );
        setEditingColumnId(null);
        setError("");
      })
      .catch((error) => {
        setError(error.response?.data?.message || "Error updating column");
        console.error(error);
      });
  };

  // Delete column
  const handleDeleteColumn = (columnId) => {
    if (!token) {
      setError("You must be logged in to delete the column");
      return;
    }
    axios
      .delete(`http://localhost:3333/api/columns/${columnId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => {
        setColumns(columns.filter((column) => column.id !== columnId));
        if (selectedColumnId === columnId) setSelectedColumnId(null);
        setError("");
      })
      .catch((error) => {
        setError(error.response?.data?.message || "Error deleting column");
        console.error(error);
      });
  };

  // Update tasks in column
  const updateTasksInColumn = (columnId, tasks) => {
    setColumns(
      columns.map((column) =>
        column.id === columnId ? { ...column, tasks } : column
      )
    );
  };

  // Create task
  const handleCreateTask = (columnId) => {
    if (!token) {
      setError("You must be logged in to create a task");
      return;
    }
    if (!newTaskTitle) {
      setError("Task title is required");
      return;
    }
    axios
      .post(
        `http://localhost:3333/api/columns/${columnId}/tasks/create`,
        { 
          title: newTaskTitle, 
          description: newTaskDescription, 
          order: columns.find(col => col.id === columnId)?.tasks.length || 0 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then(() => {
        fetchTasks(columnId, updateTasksInColumn);
        setNewTaskTitle("");
        setNewTaskDescription("");
        setIsAddTaskOpen(false);
        setError("");
      })
      .catch((error) => {
        setError(error.response?.data?.message || "Error creating task");
        console.error(error);
      });
  };

  // Start editing task
  const handleEditTask = (taskId, title, description) => {
    setEditingTaskId(taskId);
    setEditedTaskTitle(title);
    setEditedTaskDescription(description || "");
  };

  // Update task
  const handleUpdateTask = (columnId, taskId) => {
    if (!token) {
      setError("You must be logged in to update a task");
      return;
    }
    if (!editedTaskTitle) {
      setError("Task title is required");
      return;
    }
    axios
      .put(
        `http://localhost:3333/api/columns/${columnId}/tasks/${taskId}`,
        { title: editedTaskTitle, description: editedTaskDescription },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then(() => {
        fetchTasks(columnId, updateTasksInColumn);
        setEditingTaskId(null);
        setError("");
      })
      .catch((error) => {
        setError(error.response?.data?.message || "Error updating task");
        console.error(error);
      });
  };

  // Delete task
  const handleDeleteTask = (columnId, taskId) => {
    if (!token) {
      setError("You must be logged in to delete a task");
      return;
    }
    axios
      .delete(`http://localhost:3333/api/columns/${columnId}/tasks/${taskId}/delete`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => {
        fetchTasks(columnId, updateTasksInColumn);
        setError("");
      })
      .catch((error) => {
        setError(error.response?.data?.message || "Error deleting task");
        console.error(error);
      });
  };

  // Select column and fetch tasks
  const handleColumnClick = (columnId) => {
    setSelectedColumnId(columnId);
    fetchTasks(columnId, updateTasksInColumn);
  };

  // Open add task form
  const handleAddTaskClick = (columnId) => {
    setIsAddTaskOpen(true);
    setNewTaskColumnId(columnId);
  };

  // Start assigning task
  const handleAssignTaskClick = (taskId) => {
    setAssignTaskId(taskId);
    setSelectedUserId("");
  };

  // Move task up
  const handleMoveTaskUp = async (columnId, taskId) => {
    if (isReordering) return;
    setIsReordering(true);

    const column = columns.find((col) => col.id === columnId);
    if (!column || !column.tasks || column.tasks.length === 0) {
      setError("ไม่พบคอลัมน์หรืองาน");
      setIsReordering(false);
      return;
    }

    const tasks = [...column.tasks];
    const taskIndex = tasks.findIndex((task) => task.id === taskId);

    if (taskIndex > 0) {
      [tasks[taskIndex - 1], tasks[taskIndex]] = [tasks[taskIndex], tasks[taskIndex - 1]];
      const updatedTasks = tasks.map((task, index) => ({ id: task.id, order: index }));

      try {
        await axios.put(
          `http://localhost:3333/api/columns/${columnId}/list_tasks/reorder`, 
          { tasks: updatedTasks },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        fetchTasks(columnId, updateTasksInColumn);
        setError("");
      } catch (error) {
        setError(error.response?.data?.message || "เกิดข้อผิดพลาดในการเลื่อนงานขึ้น");
        console.error(error);
      }
    }
    setIsReordering(false);
  };

  // Move task down
  const handleMoveTaskDown = async (columnId, taskId) => {
    if (isReordering) return;
    setIsReordering(true);

    const column = columns.find((col) => col.id === columnId);
    if (!column || !column.tasks || column.tasks.length === 0) {
      setError("ไม่พบคอลัมน์หรืองาน");
      setIsReordering(false);
      return;
    }

    const tasks = [...column.tasks];
    const taskIndex = tasks.findIndex((task) => task.id === taskId);

    if (taskIndex < tasks.length - 1) {
      [tasks[taskIndex], tasks[taskIndex + 1]] = [tasks[taskIndex + 1], tasks[taskIndex]];
      const updatedTasks = tasks.map((task, index) => ({ id: task.id, order: index }));

      try {
        await axios.put(
          `http://localhost:3333/api/columns/${columnId}/list_tasks/reorder`, 
          { tasks: updatedTasks },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        fetchTasks(columnId, updateTasksInColumn);
        setError("");
      } catch (error) {
        setError(error.response?.data?.message || "เกิดข้อผิดพลาดในการเลื่อนงานลง");
        console.error(error);
      }
    }
    setIsReordering(false);
  };

  return (
    <div className="boards-container">
      <h1>Owner Boards</h1>
      {error && <p className="error-message">{error}</p>}
      {ownerBoards.length === 0 ? (
        <p>No boards found</p>
      ) : (
        <div className="board-list">
          {ownerBoards.map((board) => (
            <div key={board.id} className="board-item">
              {editingBoardId === board.id ? (
                <>
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                  />
                  <button onClick={() => handleSaveEdit(board.id)}>Save</button>
                </>
              ) : (
                <>
                  <span onClick={() => handleBoardClick(board.id)}>{board.name}</span>
                  <button onClick={() => handleEditBoard(board.id, board.name)}>Edit</button>
                  <button onClick={() => handleDeleteBoard(board.id)}>Delete</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <h2>Member Boards</h2>
      {memberBoards.length === 0 ? (
        <p>No boards found</p>
      ) : (
        <div className="board-list">
          {memberBoards.map((board) => (
            <div key={board.id} className="board-item">
              <span onClick={() => handleBoardClick(board.id)}>{board.name}</span>
            </div>
          ))}
        </div>
      )}

      {selectedBoardId && (
        <div className="board-content">
          {/* Columns Container (Left) */}
          <div className="columns-container">
            <h2>Columns</h2>
            <button onClick={() => setIsAddColumnOpen(true)}>Add Column</button>
            {isAddColumnOpen && (
              <div className="add-column-form">
                <input
                  type="text"
                  placeholder="Enter column name"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                />
                <button onClick={handleAddColumn}>Save</button>
                <button onClick={() => setIsAddColumnOpen(false)}>Cancel</button>
              </div>
            )}
            {columns.length === 0 ? (
              <p>No columns found</p>
            ) : (
              columns.map((column) => (
                <div key={column.id} className="column-item">
                  {editingColumnId === column.id ? (
                    <>
                      <input
                        type="text"
                        value={editedColumnName}
                        onChange={(e) => setEditedColumnName(e.target.value)}
                      />
                      <button onClick={() => handleSaveColumnEdit(column.id)}>Save</button>
                    </>
                  ) : (
                    <div className="column-header">
                      <h3 onClick={() => handleColumnClick(column.id)}>{column.name}</h3>
                      <div className="column-actions">
                        <button onClick={() => handleEditColumn(column.id, column.name)}>Edit</button>
                        <button onClick={() => handleDeleteColumn(column.id)}>Delete</button>
                      </div>
                    </div>
                  )}
                  <button onClick={() => handleAddTaskClick(column.id)}>Add Task</button>
                </div>
              ))
            )}
          </div>

          <div className="tasks-container">
            <h2>Tasks {selectedColumnId && `- ${columns.find(col => col.id === selectedColumnId)?.name}`}</h2>
            {isAddTaskOpen && newTaskColumnId && (
              <div className="add-task-form">
                <input
                  type="text"
                  placeholder="Task title"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                />
                <textarea
                  placeholder="Task description"
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                />
                <button onClick={() => handleCreateTask(newTaskColumnId)}>Save</button>
                <button onClick={() => setIsAddTaskOpen(false)}>Cancel</button>
              </div>
            )}
            {selectedColumnId ? (
              columns.find((col) => col.id === selectedColumnId)?.tasks?.length > 0 ? (
                columns
                  .find((col) => col.id === selectedColumnId)
                  .tasks.map((task) => (
                    <div key={task.id} className="task-item">
                      <div className="task-content">
                        {editingTaskId === task.id ? (
                          <>
                            <input
                              type="text"
                              value={editedTaskTitle}
                              onChange={(e) => setEditedTaskTitle(e.target.value)}
                              placeholder="Task title"
                            />
                            <textarea
                              value={editedTaskDescription}
                              onChange={(e) => setEditedTaskDescription(e.target.value)}
                              placeholder="Task description"
                            />
                          </>
                        ) : (
                          <>
                            <p><strong>{task.title}</strong></p>
                            <p>{task.description}</p>
                            <p>
                              <em>
                                Assigned to:{" "}
                                {task.assigned_user_id
                                  ? boardMembers.find((m) => m.id === task.assigned_user_id)?.email || "Unknown"
                                  : "Not assigned"}
                              </em>
                            </p>
                          </>
                        )}
                      </div>
                      <div className="task-actions">
                        {editingTaskId === task.id ? (
                          <button onClick={() => handleUpdateTask(selectedColumnId, task.id)}>Save</button>
                        ) : (
                          <>
                            <button onClick={() => handleEditTask(task.id, task.title, task.description)}>
                              Edit
                            </button>
                            <button onClick={() => handleDeleteTask(selectedColumnId, task.id)}>Delete</button>
                            <button onClick={() => handleAssignTaskClick(task.id)}>Assign</button>
                            <button
                              onClick={() => handleMoveTaskUp(selectedColumnId, task.id)}
                              disabled={task.order === 0 || isReordering}
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => handleMoveTaskDown(selectedColumnId, task.id)}
                              disabled={task.order === (columns.find(col => col.id === selectedColumnId)?.tasks.length - 1) || isReordering}
                            >
                              ↓
                            </button>
                          </>
                        )}
                      </div>
                      {assignTaskId === task.id && (
                        <div className="assign-task-form">
                          <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                          >
                            <option value="">Select a user</option>
                            {boardMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.email}
                              </option>
                            ))}
                          </select>
                          <button onClick={() => handleAssignTask(task.id)}>Assign</button>
                          <button onClick={() => setAssignTaskId(null)}>Cancel</button>
                        </div>
                      )}
                    </div>
                  ))
              ) : (
                <p>No tasks found for this column</p>
              )
            ) : (
              <p>Please select a column to view tasks</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GetBoards;