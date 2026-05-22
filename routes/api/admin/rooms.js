// Bulk create rooms
router.post('/bulk', async (req, res) => {
    try {
        const { room_type_id, floor, count, start_number, prefix } = req.body;
        const rooms = [];
        const startNum = parseInt(start_number);
        const cnt = parseInt(count);
        
        for (let i = 0; i < cnt; i++) {
            const num = prefix ? prefix + String(startNum + i).padStart(2, '0') : String(startNum + i);
            rooms.push({
                room_number: num,
                room_type_id: parseInt(room_type_id),
                floor: parseInt(floor) || 1,
                status: 'available'
            });
        }
        await db.Room.bulkCreate(rooms);
        res.json({ success: true, count: rooms.length });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});