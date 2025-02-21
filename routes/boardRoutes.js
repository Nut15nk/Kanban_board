const express = require('express');
const router = express.Router();
const boardController = require('../controller/boardController');
const authMiddleware = require('../authMiddleware');

// เส้นทางสำหรับการสร้าง Board ใหม่
router.post('/boards', authMiddleware, boardController.createBoard);

// เส้นทางสำหรับการดึงข้อมูล Boards ที่ผู้ใช้เป็นเจ้าของ
router.get('/boards/owner', authMiddleware, boardController.getOwnerBoards);

// เส้นทางสำหรับการดึงข้อมูล Boards ที่ผู้ใช้เป็นสมาชิก
router.get('/boards/member', authMiddleware, boardController.getMemberBoards);

// เส้นทางสำหรับการอัปเดตชื่อ Board
router.put('/boards/:boardId', authMiddleware, boardController.updateBoard);

// เส้นทางสำหรับการลบ Board
router.delete('/boards/:boardId', authMiddleware, boardController.deleteBoard);

// เส้นทางสำหรับการเชิญผู้ใช้เข้าร่วม Board
router.post('/boards/:boardId/invite', authMiddleware, boardController.inviteUserToBoard);

// เส้นทางสำหรับการดึงคำเชิญ
router.get('/invites', authMiddleware, boardController.getInvites);

// เส้นทางสำหรับการตอบรับคำเชิญ
router.put('/invite/accept/:inviteId', authMiddleware, boardController.acceptInvite);

// เส้นทางสำหรับการปฏิเสธคำเชิญ
router.put('/invite/reject/:inviteId', authMiddleware, boardController.rejectInvite);

// เส้นทางสำหรับสร้าง Column
router.post('/boards/:boardId/columns/create', authMiddleware, boardController.createColumn);

//Route สำหรับ GET columns
router.get("/boards/:boardId/columns", authMiddleware, boardController.getColumns);

//Route สำหรับ PUT อัปเดต Column
router.put("/columns/:columnId", authMiddleware, boardController.updateColumn);

//Route สำหรับ DELETE ลบ Column
router.delete("/columns/:columnId", authMiddleware, boardController.deleteColumn);

// Route สำหรับสร้าง Task
router.post('/columns/:columnId/tasks/create', authMiddleware,boardController.createTask);

// Route สำหรับดึงข้อมูล Tasks ของ Column
router.get('/columns/:columnId/tasks', authMiddleware,boardController.getTasks);

// Route สำหรับอัปเดต Task
router.put('/columns/:columnId/tasks/:taskId', authMiddleware,boardController.updateTask);

// Route สำหรับลบ Task
router.delete('/columns/:columnId/tasks/:taskId/delete', authMiddleware, boardController.deleteTask);

router.post('/tasks/:taskId/assign', authMiddleware, boardController.assignTask); 

router.get('/notifications', authMiddleware, boardController.getTaskNotifications);

router.put('/notifications/:notificationId/read', authMiddleware, boardController.markNotificationAsRead);

router.get('/boards/:boardId/members', authMiddleware, boardController.getBoardMembers);

router.put('/columns/:columnId/list_tasks/reorder',authMiddleware, boardController.reorderTasks);

module.exports = router;
