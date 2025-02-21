import React, { useState } from "react";
import axios from "axios";
import "./CreateBoard.css";

const CreateBoard = () => {
  const [boardName, setBoardName] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleBoardNameChange = (e) => {
    setBoardName(e.target.value);
  };

  const handleCreateBoard = async (e) => {
    e.preventDefault();

    if (!boardName) {
      setError("Board name is required");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setError("You must be logged in to create a board");
      return;
    }

    try {
      const res = await axios.post(
        "http://localhost:3333/api/boards", // ใช้ API ที่มีการตรวจสอบ JWT
        { name: boardName },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.status === 201) {
        setSuccessMessage("Board created successfully!");
        setBoardName(""); // รีเซ็ตฟอร์ม
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        setError("Invalid or expired token. Please login again.");
      } else {
        setError("Error creating board");
      }
    }
  };

  return (
    <div className="create-board-container">
      <h2>Create a New Board</h2>
      <form onSubmit={handleCreateBoard}>
        <input
          type="text"
          placeholder="Enter board name"
          value={boardName}
          onChange={handleBoardNameChange}
          required
        />
        <button type="submit">Create Board</button>
      </form>
      {error && <p className="error-message">{error}</p>}
      {successMessage && <p className="success-message">{successMessage}</p>}
    </div>
  );
};

export default CreateBoard;
