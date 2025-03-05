const connection = require('../config/db'); // เชื่อมต่อกับฐานข้อมูล MySQL

// ฟังก์ชันในการสร้าง Board
const createBoard = (req, res) => {
    const { name } = req.body;

    // ตรวจสอบว่า 'name' ไม่ใช่ undefined หรือ null
    if (!name) {
        return res.status(400).json({ message: 'Board name is required' });
    }

    // ใช้ userId ที่มาจาก token (JWT) ที่ถูกส่งมาจาก middleware auth
    const userId = req.user ? req.user.id : null;

    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized. User not authenticated' });
    }

    const query = 'INSERT INTO boards (name, owner_id) VALUES (?, ?)';
    connection.execute(query, [name, userId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        res.status(201).json({ message: 'Board created successfully', boardId: results.insertId });
    });
};


// ฟังก์ชันในการดึงข้อมูล Board ที่เป็นเจ้าของ
const getOwnerBoards = (req, res) => {
    const userId = req.user.id;  // ดึง user_id จาก token
  
    const queryOwnerBoards = 'SELECT id, name, owner_id FROM boards WHERE owner_id = ?';
  
    connection.execute(queryOwnerBoards, [userId], (err, ownerBoards) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
  
        return res.status(200).json(ownerBoards);
    });
};


// ฟังก์ชันในการดึงข้อมูล Board สมาชิก
const getMemberBoards = (req, res) => {
    const userId = req.user.id; // ดึง user_id จาก token
  
    // ดึงข้อมูล boards ที่ผู้ใช้เป็นสมาชิกจาก board_members
    const queryMemberBoards = `
      SELECT b.* FROM boards b
      INNER JOIN board_members bm ON b.id = bm.board_id
      WHERE bm.user_id = ?;
    `;
    
    connection.execute(queryMemberBoards, [userId], (err, memberBoards) => {
      if (err) {
        return res.status(500).json({ message: 'Database error', error: err });
      }
  
      // ส่งข้อมูล boards ที่ผู้ใช้เป็นสมาชิก
      res.status(200).json(memberBoards);
    });
  };
  

// ฟังก์ชันในการอัปเดตชื่อ Board
const updateBoard = (req, res) => {
    const { boardId } = req.params;
    const { name } = req.body;
    const userId = req.user.id;  // ดึง userId จาก token (เจ้าของหรือสมาชิก)

    // ตรวจสอบว่า boardId และ name ถูกส่งมาหรือไม่
    if (!name) {
        return res.status(400).json({ message: 'Board name is required' });
    }

    // ตรวจสอบว่า user เป็นเจ้าของหรือสมาชิกของ board
    const queryCheckBoardOwnerOrMember = `
      SELECT * FROM boards
      WHERE id = ? AND (owner_id = ? OR EXISTS (
        SELECT 1 FROM board_members WHERE board_id = ? AND user_id = ?
      ))
    `;

    connection.execute(queryCheckBoardOwnerOrMember, [boardId, userId, boardId, userId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }

        // ถ้าไม่มีผลลัพธ์แสดงว่า user ไม่มีสิทธิ์แก้ไข
        if (results.length === 0) {
            return res.status(403).json({ message: 'You do not have permission to edit this board' });
        }

        // อัปเดตชื่อ board
        const queryUpdateBoard = 'UPDATE boards SET name = ? WHERE id = ?';
        connection.execute(queryUpdateBoard, [name, boardId], (err, result) => {
            if (err) {
                return res.status(500).json({ message: 'Failed to update board', error: err });
            }

            res.status(200).json({ message: 'Board updated successfully' });
        });
    });
};

// ฟังก์ชันในการลบ Board
const deleteBoard = async (req, res) => {
    const { boardId } = req.params;
    const userId = req.user?.id;

    if (!boardId || isNaN(boardId)) {
        return res.status(400).json({ message: 'Invalid boardId' });
    }
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        // ตรวจสอบว่าเป็นเจ้าของ Board
        const queryCheckOwner = 'SELECT * FROM boards WHERE id = ? AND owner_id = ?';
        const [ownerResults] = await connection.promise().execute(queryCheckOwner, [boardId, userId]);

        if (ownerResults.length === 0) {
            return res.status(403).json({ message: 'You are not the owner of this board' });
        }

        // ลบ Notifications ที่เกี่ยวข้องกับ Tasks ใน Board
        const queryDeleteNotifications = `
            DELETE FROM notifications WHERE task_id IN (
                SELECT id FROM tasks WHERE column_id IN (SELECT id FROM columns WHERE board_id = ?)
            )
        `;
        await connection.promise().execute(queryDeleteNotifications, [boardId]);

        // ลบ Tasks ใน Columns ของ Board
        const queryDeleteTasks = 'DELETE FROM tasks WHERE column_id IN (SELECT id FROM columns WHERE board_id = ?)';
        await connection.promise().execute(queryDeleteTasks, [boardId]);

        // ลบ Columns ของ Board
        const queryDeleteColumns = 'DELETE FROM columns WHERE board_id = ?';
        await connection.promise().execute(queryDeleteColumns, [boardId]);

        // ลบ Board Members
        const queryDeleteMembers = 'DELETE FROM board_members WHERE board_id = ?';
        await connection.promise().execute(queryDeleteMembers, [boardId]);

        // ลบ Invites ที่เกี่ยวข้อง
        const queryDeleteInvites = 'DELETE FROM invites WHERE board_id = ?';
        await connection.promise().execute(queryDeleteInvites, [boardId]);

        // ลบ Board
        const queryDeleteBoard = 'DELETE FROM boards WHERE id = ?';
        const [result] = await connection.promise().execute(queryDeleteBoard, [boardId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Board not found' });
        }

        res.status(200).json({ message: 'Board and all related data deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Database error', error: err.message });
    }
};

// ฟังก์ชันในการสร้าง Column

const createColumn = (req, res) => {
    const { name } = req.body;
    const { boardId } = req.params;
    const userId = req.user ? req.user.id : null;  // ดึง userId จาก token

    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized. User not authenticated' });
    }

    if (!boardId || !name) {
        return res.status(400).json({ message: 'Board ID and Column name are required' });
    }

    // ตรวจสอบว่า user เป็นเจ้าของหรือสมาชิกของ board ที่จะสร้าง column
    const queryCheckBoardAccess = `
      SELECT * FROM boards b
      WHERE b.id = ? AND (b.owner_id = ? OR EXISTS (
        SELECT 1 FROM board_members bm WHERE bm.board_id = b.id AND bm.user_id = ?
      ))
    `;

    connection.execute(queryCheckBoardAccess, [boardId, userId, userId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }

        if (results.length === 0) {
            return res.status(403).json({ message: 'You do not have permission to create column for this board' });
        }

        // หากผู้ใช้มีสิทธิ์ในการสร้าง column (เป็นเจ้าของหรือสมาชิก)
        const query = 'INSERT INTO columns (name, board_id) VALUES (?, ?)';
        connection.execute(query, [name, boardId], (err, results) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err });
            }
            res.status(201).json({ message: 'Column created successfully', columnId: results.insertId });
        });
    });
};


// ฟังก์ชันในการอัปเดต Column
const updateColumn = (req, res) => {
    const { columnId } = req.params;
    const { name } = req.body;
    const userId = req.user.id; // ใช้ userId จาก token (เจ้าของหรือสมาชิก)

    if (!name) {
        return res.status(400).json({ message: 'Column name is required' });
    }

    // ตรวจสอบว่า user เป็นเจ้าของหรือสมาชิกของ board ที่ Column นี้อยู่
    const queryCheckBoardAccess = `
      SELECT * FROM columns c
      JOIN boards b ON c.board_id = b.id
      WHERE c.id = ? AND (b.owner_id = ? OR EXISTS (
        SELECT 1 FROM board_members WHERE board_id = b.id AND user_id = ?
      ))
    `;

    connection.execute(queryCheckBoardAccess, [columnId, userId, userId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }

        if (results.length === 0) {
            return res.status(403).json({ message: 'You do not have permission to update this column' });
        }

        // อัปเดตชื่อ column
        const queryUpdateColumn = 'UPDATE columns SET name = ? WHERE id = ?';
        connection.execute(queryUpdateColumn, [name, columnId], (err, result) => {
            if (err) {
                return res.status(500).json({ message: 'Failed to update column', error: err });
            }

            res.status(200).json({ message: 'Column updated successfully' });
        });
    });
};
  

// ฟังก์ชันในการอัปเดต Column
const deleteColumn = async (req, res) => {
    const { columnId } = req.params;
    const userId = req.user?.id;

    if (!columnId || isNaN(columnId)) {
        return res.status(400).json({ message: 'Invalid columnId' });
    }
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        // ตรวจสอบสิทธิ์
        const queryCheckAccess = `
            SELECT c.id
            FROM columns c
            JOIN boards b ON c.board_id = b.id
            LEFT JOIN board_members bm ON b.id = bm.board_id AND bm.user_id = ?
            WHERE c.id = ? AND (b.owner_id = ? OR bm.user_id = ?)
        `;
        const [accessResults] = await connection.promise().execute(queryCheckAccess, [userId, columnId, userId, userId]);

        if (accessResults.length === 0) {
            return res.status(403).json({ message: 'You do not have permission to delete this column' });
        }

        // ลบ Notifications ที่เกี่ยวข้องกับ Tasks ใน Column
        const queryDeleteNotifications = `
            DELETE FROM notifications WHERE task_id IN (SELECT id FROM tasks WHERE column_id = ?)
        `;
        await connection.promise().execute(queryDeleteNotifications, [columnId]);

        // ลบ Tasks ใน Column
        const queryDeleteTasks = 'DELETE FROM tasks WHERE column_id = ?';
        await connection.promise().execute(queryDeleteTasks, [columnId]);

        // ลบ Column
        const queryDeleteColumn = 'DELETE FROM columns WHERE id = ?';
        const [result] = await connection.promise().execute(queryDeleteColumn, [columnId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Column not found' });
        }

        res.status(200).json({ message: 'Column and related data deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Database error', error: err.message });
    }
};

const getColumns = (req, res) => {
    const { boardId } = req.params;
    const userId = req.user ? req.user.id : null; // ดึง userId จาก token

    // ตรวจสอบว่า boardId เป็นตัวเลขหรือไม่
    if (!boardId || isNaN(boardId)) {
        return res.status(400).json({ message: "Invalid board ID" });
    }

    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized. User not authenticated' });
    }

    try {
        // ตรวจสอบการยืนยันสิทธิ์การเข้าถึง board (เจ้าของหรือสมาชิก)
        const queryCheckBoardAccess = `
          SELECT 1 FROM boards b
          WHERE b.id = ? AND (b.owner_id = ? OR EXISTS (
            SELECT 1 FROM board_members bm WHERE bm.board_id = b.id AND bm.user_id = ?
          )) LIMIT 1
        `;
        connection.execute(queryCheckBoardAccess, [boardId, userId, userId], (err, boardAccess) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err.message });
            }

            if (boardAccess.length === 0) {
                return res.status(403).json({ message: 'You do not have permission to view columns for this board' });
            }

            // ดึงข้อมูล columns ของ board
            const query = 'SELECT * FROM columns WHERE board_id = ?';
            connection.execute(query, [boardId], (err, rows) => {
                if (err) {
                    return res.status(500).json({ message: 'Database error', error: err.message });
                }

                // หากไม่พบข้อมูลใดๆ
                if (rows.length === 0) {
                    return res.status(404).json({ message: `No columns found for board with ID: ${boardId}` });
                }

                // ส่งข้อมูล columns
                res.status(200).json(rows);
            });
        });
    } catch (err) {
        // หากเกิดข้อผิดพลาดในการประมวลผล
        console.error("Unexpected error:", err);
        return res.status(500).json({ message: 'Unexpected error occurred', error: err.message });
    }
};

// ฟังก์ชันในการสร้าง Task
const createTask = (req, res) => {
    const { title, description } = req.body;
    const { columnId } = req.params;

    // ตรวจสอบค่าที่ได้รับจาก frontend
    console.log("Received columnId:", columnId);
    console.log("Received title:", title);
    console.log("Received description:", description);

    // ตรวจสอบว่า columnId และ title ได้รับค่ามาหรือไม่
    if (!columnId || !title) {
        return res.status(400).json({ message: 'Column ID and Task title are required' });
    }

    const taskDescription = description || null;  // กรณีที่ไม่มี description จะตั้งค่าเป็น null

    // คำสั่ง SQL เพื่อเพิ่ม task ใหม่
    const query = 'INSERT INTO tasks (title, description, column_id) VALUES (?, ?, ?)';
    connection.execute(query, [title, taskDescription, columnId], (err, results) => {
        if (err) {
            console.error("Database error:", err); // แสดงข้อผิดพลาดจากฐานข้อมูล
            return res.status(500).json({ message: 'Database error', error: err });
        }

        // ส่ง response กลับมาให้ผู้ใช้
        res.status(201).json({ message: 'Task created successfully', taskId: results.insertId });
    });
};



// ฟังก์ชันในการดึงข้อมูล Tasks ของ Column ที่ระบุ
const getTasks = async (req, res) => {
    const { columnId } = req.params;
    const userId = req.user.id;

    if (!columnId || isNaN(columnId)) {
        return res.status(400).json({ message: 'Invalid columnId' });
    }

    try {
        // ตรวจสอบ Column และสิทธิ์ใน query เดียว
        const queryCheckAccess = `
            SELECT c.id, b.owner_id
            FROM columns c
            JOIN boards b ON c.board_id = b.id
            LEFT JOIN board_members bm ON b.id = bm.board_id AND bm.user_id = ?
            WHERE c.id = ? AND (b.owner_id = ? OR bm.user_id = ?)
        `;
        const [accessResults] = await connection.promise().execute(queryCheckAccess, [userId, columnId, userId, userId]);

        if (accessResults.length === 0) {
            return res.status(403).json({ message: 'You do not have permission to view tasks in this column' });
        }

        // ดึง Tasks
        const queryTasks = 'SELECT * FROM tasks WHERE column_id = ?';
        const [tasks] = await connection.promise().execute(queryTasks, [columnId]);

        res.status(200).json(tasks);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Database error', error: err.message });
    }
};

const updateTask = (req, res) => {
    const { taskId, columnId } = req.params;
    const { title, description } = req.body;

    if (!title || title === undefined) {
        return res.status(400).json({ message: 'Title is required' });
    }
    if (!columnId || isNaN(columnId) || !taskId || isNaN(taskId)) {
        return res.status(400).json({ message: 'Invalid columnId or taskId' });
    }

    const updatedDescription = description !== undefined ? description : null;

    const queryCheck = 'SELECT * FROM tasks WHERE id = ? AND column_id = ?';
    connection.execute(queryCheck, [taskId, columnId], (err, checkResults) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        if (checkResults.length === 0) {
            return res.status(404).json({ message: 'Task not found in this column' });
        }

        const query = 'UPDATE tasks SET title = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND column_id = ?';
        connection.execute(query, [title, updatedDescription, taskId, columnId], (err, results) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err });
            }
            if (results.affectedRows === 0) {
                return res.status(404).json({ message: 'Task not found' });
            }
            res.status(200).json({ message: 'Task updated successfully' });
        });
    });
};


// ฟังก์ชันในการลบ Task
const deleteTask = async (req, res) => {
    const { taskId, columnId } = req.params;
    const userId = req.user?.id;

    if (!taskId || isNaN(taskId) || !columnId || isNaN(columnId)) {
        return res.status(400).json({ message: 'Invalid taskId or columnId' });
    }
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        // ตรวจสอบสิทธิ์
        const queryCheckAccess = `
            SELECT t.id
            FROM tasks t
            JOIN columns c ON t.column_id = c.id
            JOIN boards b ON c.board_id = b.id
            LEFT JOIN board_members bm ON b.id = bm.board_id AND bm.user_id = ?
            WHERE t.id = ? AND t.column_id = ? AND (b.owner_id = ? OR bm.user_id = ?)
        `;
        const [accessResults] = await connection.promise().execute(queryCheckAccess, [userId, taskId, columnId, userId, userId]);

        if (accessResults.length === 0) {
            return res.status(403).json({ message: 'You do not have permission to delete this task or task not found' });
        }

        // ลบการแจ้งเตือนที่เกี่ยวข้องกับ Task
        const queryDeleteNotifications = 'DELETE FROM notifications WHERE task_id = ?';
        await connection.promise().execute(queryDeleteNotifications, [taskId]);

        // ลบ Task
        const queryDeleteTask = 'DELETE FROM tasks WHERE id = ? AND column_id = ?';
        const [result] = await connection.promise().execute(queryDeleteTask, [taskId, columnId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Task not found' });
        }

        res.status(200).json({ message: 'Task and related notifications deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Database error', error: err.message });
    }
};

const inviteUserToBoard = (req, res) => {
    const { boardId, inviterEmail } = req.body;  // ข้อมูลที่มาจาก body
    const inviterId = req.user.id;  // ใช้ user ID ที่มาจาก token
  
    // ตรวจสอบว่า boardId และ inviterEmail ถูกส่งมาหรือไม่
    if (!boardId || !inviterEmail) {
        return res.status(400).json({ message: 'Board ID and Inviter email are required' });
    }
  
    // ตรวจสอบว่า inviterEmail ที่เชิญนั้นไม่ใช่อีเมลของผู้เชิญเอง
    if (inviterEmail === req.user.email) {
        return res.status(400).json({ message: 'You cannot invite yourself to the board' });
    }

    console.log('User email from token:', req.user.email);  // ตรวจสอบอีเมลที่มาจาก token
    console.log('Inviter email:', inviterEmail);  // ตรวจสอบอีเมลที่เชิญ
  
    // ตรวจสอบว่า boardId ที่ผู้ใช้เชิญนั้นเป็น board ที่ผู้ใช้เป็นเจ้าของ
    const queryCheckOwner = 'SELECT * FROM boards WHERE id = ? AND owner_id = ?';
    connection.execute(queryCheckOwner, [boardId, inviterId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        if (results.length === 0) {
            return res.status(403).json({ message: 'You are not the owner of this board' });
        }

        // ตรวจสอบว่าอีเมลที่เชิญมีผู้ใช้ที่ลงทะเบียนแล้วหรือไม่
        const queryCheckUser = 'SELECT * FROM users WHERE email = ?';
        connection.execute(queryCheckUser, [inviterEmail], (err, results) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err });
            }
            if (results.length === 0) {
                return res.status(404).json({ message: 'User not found with this email' });
            }

            const inviterId = results[0].id;  // ID ของผู้ที่ได้รับคำเชิญ

            // ตรวจสอบการเชิญของผู้ใช้
            const queryCheckInvite = 'SELECT * FROM invites WHERE board_id = ? AND inviter_id = ? AND status = "pending"';
            connection.execute(queryCheckInvite, [boardId, inviterId], (err, results) => {
                if (err) {
                    return res.status(500).json({ message: 'Database error', error: err });
                }
                if (results.length > 0) {
                    return res.status(400).json({ message: 'User already invited to this board' });
                }

                // เพิ่มคำเชิญในฐานข้อมูล
                const queryInsertInvite = 'INSERT INTO invites (board_id, inviter_id, inviter_email, status) VALUES (?, ?, ?, "pending")';
                connection.execute(queryInsertInvite, [boardId, inviterId, inviterEmail], (err, results) => {
                    if (err) {
                        return res.status(500).json({ message: 'Failed to send invitation', error: err });
                    }
                    res.status(200).json({ message: 'Invitation sent successfully' });
                });
            });
        });
    });
};

// ฟังก์ชันในการดึงข้อมูลคำเชิญที่ยังไม่ได้รับการตอบรับ (Pending Invitations)
const getInvites = (req, res) => {
    const userId = req.user.id; // รับ userId จาก token

    const query = 'SELECT * FROM invites WHERE inviter_id = ? AND status = "pending"';
    connection.execute(query, [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        res.status(200).json(results); // ส่งคำเชิญทั้งหมดที่มีสถานะเป็น "pending"
    });
};

const acceptInvite = (req, res) => {
    const { inviteId } = req.params;
    const userId = req.user.id; // ใช้ user ID ที่มาจาก token

    const queryUpdateInvite = 'UPDATE invites SET status = "accepted" WHERE id = ? AND inviter_id = ?';
    connection.execute(queryUpdateInvite, [inviteId, userId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }

        // ตรวจสอบว่าเราอัปเดตคำเชิญสำเร็จหรือไม่
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'Invite not found or not assigned to this user' });
        }

        // ดึงข้อมูลคำเชิญเพื่อเข้าถึง board_id
        const queryGetInvite = 'SELECT * FROM invites WHERE id = ?';
        connection.execute(queryGetInvite, [inviteId], (err, inviteResults) => {
            if (err) {
                return res.status(500).json({ message: 'Error fetching invite details', error: err });
            }

            // ตรวจสอบว่าเราได้รับคำเชิญที่ถูกต้อง
            if (!inviteResults || inviteResults.length === 0) {
                return res.status(404).json({ message: 'Invite not found' });
            }

            const boardId = inviteResults[0].board_id;  // ดึง board_id จากคำเชิญ

            // เพิ่มผู้ใช้ใน board_member
            const queryAddUserToBoard = 'INSERT INTO board_members (board_id, user_id, role) VALUES (?, ?, "member")';
            connection.execute(queryAddUserToBoard, [boardId, userId], (err, results) => {
                if (err) {
                    return res.status(500).json({ message: 'Error adding user to board_members', error: err });
                }

                // ดึงข้อมูล board ที่ผู้ใช้เข้าร่วม
                const queryGetBoard = 'SELECT * FROM boards WHERE id = ?';
                connection.execute(queryGetBoard, [boardId], (err, boardResults) => {
                    if (err) {
                        return res.status(500).json({ message: 'Error fetching board details', error: err });
                    }

                    res.status(200).json({
                        message: 'Invite accepted successfully',
                        board: boardResults[0],
                    });
                });
            });
        });
    });
};


// ฟังก์ชันสำหรับการปฏิเสธคำเชิญ
const rejectInvite = (req, res) => {
    const { inviteId } = req.params;
    const userId = req.user.id;

    const query = 'UPDATE invites SET status = "rejected" WHERE id = ? AND inviter_id = ?';
    connection.execute(query, [inviteId, userId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        res.status(200).json({ message: 'Invite rejected successfully' });
    });
};

// ฟังก์ชันมอบหมายงาน
const assignTask = (req, res) => {
    const { taskId } = req.params;
    const { assignedUserId } = req.body;
    const assignerId = req.user.id;

    const taskIdNum = parseInt(taskId, 10);
    const assignedUserIdNum = parseInt(assignedUserId, 10);
    if (isNaN(taskIdNum) || isNaN(assignedUserIdNum)) {
        return res.status(400).json({ message: 'Task ID and Assigned User ID must be valid numbers' });
    }

    const queryCheckAccess = `
        SELECT t.id, b.owner_id
        FROM tasks t
        JOIN columns c ON t.column_id = c.id
        JOIN boards b ON c.board_id = b.id
        LEFT JOIN board_members bm ON b.id = bm.board_id AND bm.user_id = ?
        WHERE t.id = ? AND (b.owner_id = ? OR bm.user_id = ?)
    `;
    connection.execute(queryCheckAccess, [assignerId, taskIdNum, assignerId, assignerId], (err, accessResults) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        if (accessResults.length === 0) {
            return res.status(403).json({ message: 'You do not have permission to assign this task' });
        }

        const queryCheckMember = `
            SELECT 1
            FROM boards b
            JOIN columns c ON b.id = c.board_id
            JOIN tasks t ON t.column_id = c.id
            LEFT JOIN board_members bm ON b.id = bm.board_id AND bm.user_id = ?
            WHERE t.id = ? AND (b.owner_id = ? OR bm.user_id = ?)
        `;
        connection.execute(queryCheckMember, [assignedUserIdNum, taskIdNum, assignedUserIdNum, assignedUserIdNum], (err, memberResults) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err });
            }
            if (memberResults.length === 0) {
                return res.status(400).json({ message: 'Assigned user is not a member or owner of this board' });
            }

            const queryCheckAssignment = 'SELECT assigned_user_id FROM tasks WHERE id = ?';
            connection.execute(queryCheckAssignment, [taskIdNum], (err, taskResult) => {
                if (err) {
                    return res.status(500).json({ message: 'Database error', error: err });
                }
                if (taskResult.length > 0 && taskResult[0].assigned_user_id === assignedUserIdNum) {
                    return res.status(400).json({ message: 'This user is already assigned to the task' });
                }

                const queryAssignTask = 'UPDATE tasks SET assigned_user_id = ? WHERE id = ?';
                connection.execute(queryAssignTask, [assignedUserIdNum, taskIdNum], (err, updateResult) => {
                    if (err) {
                        return res.status(500).json({ message: 'Failed to assign task', error: err });
                    }
                    if (updateResult.affectedRows === 0) {
                        return res.status(404).json({ message: 'Task not found' });
                    }

                    const taskTitleQuery = 'SELECT title FROM tasks WHERE id = ?';
                    connection.execute(taskTitleQuery, [taskIdNum], (err, taskResult) => {
                        if (err) {
                            return res.status(500).json({ message: 'Database error', error: err });
                        }
                        if (taskResult.length === 0) {
                            return res.status(404).json({ message: 'Task not found' });
                        }

                        const taskTitle = taskResult[0].title;
                        const notificationMessage = `คุณได้รับมอบหมายงาน: ${taskTitle}`;

                        const queryInsertNotification = `
                            INSERT INTO notifications (user_id, task_id, message)
                            VALUES (?, ?, ?)
                        `;
                        connection.execute(queryInsertNotification, [assignedUserIdNum, taskIdNum, notificationMessage], (err) => {
                            if (err) {
                                return res.status(500).json({ message: 'Failed to create notification', error: err });
                            }
                            res.status(200).json({ message: 'Task assigned successfully and notification sent' });
                        });
                    });
                });
            });
        });
    });
};

// ฟังก์ชันดึงการแจ้งเตือน
const getTaskNotifications = (req, res) => {
    const userId = req.user.id;

    const query = `
        SELECT n.id, n.task_id, n.message, n.status, n.created_at, t.title AS task_title
        FROM notifications n
        JOIN tasks t ON n.task_id = t.id
        WHERE n.user_id = ?
        ORDER BY n.created_at DESC
    `;
    connection.execute(query, [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        if (results.length === 0) {
            return res.status(200).json({ message: 'No notifications found', notifications: [] });
        }
        res.status(200).json({ message: 'Notifications retrieved successfully', notifications: results });
    });
};

// ฟังก์ชันทำเครื่องหมายว่าอ่านแล้ว
const markNotificationAsRead = (req, res) => {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notificationIdNum = parseInt(notificationId, 10);
    if (isNaN(notificationIdNum)) {
        return res.status(400).json({ message: 'Notification ID must be a valid number' });
    }

    const query = 'UPDATE notifications SET status = "read" WHERE id = ? AND user_id = ?';
    connection.execute(query, [notificationIdNum, userId], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Notification not found or not assigned to you' });
        }
        res.status(200).json({ message: 'Notification marked as read' });
    });
};

const getBoardMembers = (req, res) => {
    const { boardId } = req.params;
    const userId = req.user.id;
  
    const query = `
      SELECT DISTINCT u.id, u.email
      FROM users u
      LEFT JOIN board_members bm ON u.id = bm.user_id AND bm.board_id = ?
      WHERE u.id = (SELECT owner_id FROM boards WHERE id = ?) OR bm.user_id IS NOT NULL
    `;
    connection.execute(query, [boardId, boardId], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ message: "Database error", error: err });
      }
      res.status(200).json(results);
    });
  };


  const reorderTasks = (req, res) => {
    const { columnId } = req.params;
    const { tasks } = req.body;

    console.log(`reorderTasks called: columnId=${columnId}, tasks=`, tasks);

    // Check if tasks is an array
    if (!Array.isArray(tasks)) {
        return res.status(400).json({ message: "Tasks must be an array" });
    }

    // Validate that each task has an id and order as a number
    if (tasks.some(task => !task.id || typeof task.order !== 'number')) {
        return res.status(400).json({ message: "Tasks must have a valid id and order" });
    }

    const userId = req.user.id;

    // Query to check permissions
    const queryCheckAccess = `
        SELECT 1 FROM columns c
        JOIN boards b ON c.board_id = b.id
        WHERE c.id = ? AND (b.owner_id = ? OR EXISTS (
            SELECT 1 FROM board_members bm WHERE bm.board_id = b.id AND bm.user_id = ?
        ))
    `;

    connection.execute(queryCheckAccess, [columnId, userId, userId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: "Database error", error: err });
        }
        if (results.length === 0) {
            return res.status(403).json({ message: "You do not have permission" });
        }

        // Update tasks
        let completedUpdates = 0;
        const totalUpdates = tasks.length;

        if (totalUpdates === 0) {
            return res.status(200).json({ message: "Task reordering completed (no tasks to update)" });
        }

        tasks.forEach((task) => {
            connection.query(
                'UPDATE tasks SET `order` = ? WHERE id = ? AND column_id = ?',
                [task.order, task.id, columnId],
                (err, result) => {
                    if (err) {
                        return res.status(500).json({ message: "Error occurred while reordering tasks", error: err });
                    }

                    completedUpdates++;
                    if (completedUpdates === totalUpdates) {
                        res.status(200).json({ message: "Task reordering completed successfully" });
                    }
                }
            );
        });
    });
};

module.exports = {
    createBoard,
    createColumn,
    createTask,
    getMemberBoards,
    getOwnerBoards,
    getColumns,
    getTasks,
    deleteBoard,
    updateBoard,
    updateColumn,
    deleteColumn,
    acceptInvite,
    rejectInvite,
    inviteUserToBoard,
    getInvites,
    deleteTask,
    updateTask,
    assignTask,
    getTaskNotifications,
    markNotificationAsRead,
    getBoardMembers,
    reorderTasks
};
