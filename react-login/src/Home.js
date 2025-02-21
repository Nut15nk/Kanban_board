import React, { useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Home.css";

const Home = ({ token }) => {
  const [boards, setBoards] = useState([]);
  const [invites, setInvites] = useState([]);
  const [inviteData, setInviteData] = useState({}); // ใช้ object เพื่อเก็บข้อมูลแยกตาม board ID
  const [error, setError] = useState("");
  const [selectedBoard, setSelectedBoard] = useState(null);
  const navigate = useNavigate();

  const fetchBoards = useCallback(async () => {
    try {
      const response = await axios.get("http://localhost:3333/api/boards/owner", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBoards(response.data);
      setError("");
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      }
      setError(error.response?.data?.message || "Error fetching boards");
      console.error(error);
    }
  }, [token, navigate]);

  const fetchInvites = useCallback(async () => {
    try {
      const response = await axios.get("http://localhost:3333/api/invites", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInvites(response.data);
      setError("");
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      }
      setError(error.response?.data?.message || "Error fetching invites");
      console.error(error);
    }
  }, [token, navigate]);

  React.useEffect(() => {
    if (token) {
      fetchBoards();
      fetchInvites();
    }
  }, [token, fetchBoards, fetchInvites]);

  const handleAcceptInvite = async (inviteId) => {
    try {
      const response = await axios.put(
        `http://localhost:3333/api/invite/accept/${inviteId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedBoard(response.data.board);
      setInvites(invites.filter((invite) => invite.id !== inviteId));
      setError("");
      fetchBoards();
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      }
      setError(error.response?.data?.message || "Error accepting invite");
      console.error(error);
    }
  };

  const handleRejectInvite = async (inviteId) => {
    try {
      await axios.put(
        `http://localhost:3333/api/invite/reject/${inviteId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInvites(invites.filter((invite) => invite.id !== inviteId));
      setError("");
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      }
      setError(error.response?.data?.message || "Error rejecting invite");
      console.error(error);
    }
  };

  const handleInviteUser = async (boardId) => {
    const email = inviteData[boardId]?.email || "";
    if (!email) {
      alert("Please enter an email to send an invite.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      alert("Please enter a valid email address.");
      return;
    }
    try {
      await axios.post(
        `http://localhost:3333/api/boards/${boardId}/invite`,
        { boardId, inviterEmail: email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Invitation sent successfully!");
      setInviteData((prev) => ({
        ...prev,
        [boardId]: { email: "", isInviting: false }, // รีเซ็ตหลังส่ง
      }));
      fetchBoards();
      fetchInvites();
      setError("");
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      }
      setError(error.response?.data?.message || "Error inviting user");
      console.error(error);
    }
  };

  const handleInviteChange = (boardId, value) => {
    setInviteData((prev) => ({
      ...prev,
      [boardId]: { ...prev[boardId], email: value },
    }));
  };

  const toggleInviting = (boardId) => {
    setInviteData((prev) => ({
      ...prev,
      [boardId]: {
        ...prev[boardId],
        isInviting: !prev[boardId]?.isInviting,
        email: prev[boardId]?.email || "", // รักษาค่า email ถ้ามี
      },
    }));
  };

  return (
    <div className="home-container">
      <h1>Your Boards</h1>
      <ul>
        {boards.length === 0 ? (
          <p>No boards found</p>
        ) : (
          boards.map((board) => (
            <li key={board.id}>
              {board.name}
              <button onClick={() => toggleInviting(board.id)}>Invite</button>
              {inviteData[board.id]?.isInviting && (
                <div className="invite-form">
                  <input
                    type="email"
                    value={inviteData[board.id]?.email || ""}
                    onChange={(e) => handleInviteChange(board.id, e.target.value)}
                    placeholder="Enter email to invite"
                  />
                  <button onClick={() => handleInviteUser(board.id)}>Send Invite</button>
                  <button onClick={() => toggleInviting(board.id)}>Cancel</button>
                </div>
              )}
            </li>
          ))
        )}
      </ul>

      <h2>Pending Invitations</h2>
      {invites.length === 0 ? (
        <p>No pending invitations</p>
      ) : (
        <div>
          {invites.map((invite) => (
            <div key={invite.id} className="invite-item">
              <p>You have been invited to join the board: {invite.board_id}</p>
              <div>
                <button onClick={() => handleAcceptInvite(invite.id)}>Accept</button>
                <button onClick={() => handleRejectInvite(invite.id)}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedBoard && (
        <div className="joined-board">
          <h3>Board You Joined</h3>
          <p>Board Name: {selectedBoard.name}</p>
        </div>
      )}

      {error && <p className="error-message">{error}</p>}
    </div>
  );
};

export default Home;