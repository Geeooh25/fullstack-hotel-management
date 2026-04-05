const express = require('express');
const router = express.Router();
const { Room, RoomType } = require('../../models');

// All working hotel room images
const roomImages = {
    // Standard Rooms (101-110)
    '101': 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800',
    '102': 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800',
    '103': 'https://images.unsplash.com/photo-1587985064135-0366536eab42?w=800',
    '104': 'https://images.unsplash.com/photo-1568495248636-6432b97bd949?w=800',
    '105': 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800',
    '106': 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800',
    '107': 'https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?w=800',  
    '108': 'https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg?w=800',  // Fixed
    '109': 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800',  // Fixed
    '110': 'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800',
    
    // Deluxe Rooms (201-208)
    '201': 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
    '202': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
    '203': 'https://images.pexels.com/photos/262048/pexels-photo-262048.jpeg?w=800',  // Fixed
    '204': 'https://images.unsplash.com/photo-1568495248636-6432b97bd949?w=800',
    '205': 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800',
    '206': 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',  // Fixed
    '207': 'https://images.pexels.com/photos/262048/pexels-photo-262048.jpeg?w=800',  // Fixed
    '208': 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800',
    
    // Executive Suites (301-304)
    '301': 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800',
    '302': 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
    '303': 'https://images.unsplash.com/photo-1631049035182-249067d7618e?w=800',
    '304': 'https://images.unsplash.com/photo-1568495248636-6432b97bd949?w=800'
};

// Fallback images by room type
const fallbackImages = {
    'Standard Room': 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800',
    'Deluxe Room': 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
    'Executive Suite': 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800'
};

// Helper to parse room notes
function parseRoomNotes(notes) {
    if (!notes) {
        return {
            description: 'Comfortable room with essential amenities.',
            view: 'City View',
            specialFeature: ''
        };
    }

    const descriptionMatch = notes.match(/^([^|]+)/);
    const viewMatch = notes.match(/View: ([^|]+)/);
    const featureMatch = notes.match(/\| ([^|]+)$/);

    return {
        description: descriptionMatch ? descriptionMatch[1].trim() : 'Comfortable room with essential amenities.',
        view: viewMatch ? viewMatch[1].trim() : 'City View',
        specialFeature: featureMatch ? featureMatch[1].trim() : ''
    };
}

// Helper to parse amenities
function parseAmenities(amenities) {
    if (!amenities) return ['Free WiFi', 'Flat-screen TV', 'Air Conditioning'];
    if (Array.isArray(amenities)) return amenities;
    if (typeof amenities === 'string') {
        try {
            const parsed = JSON.parse(amenities);
            if (Array.isArray(parsed)) return parsed;
        } catch (e) {}
        if (amenities.includes(',')) {
            return amenities.split(',').map(a => a.trim());
        }
    }
    return ['Free WiFi', 'Flat-screen TV', 'Air Conditioning'];
}

// ==================== GET /api/rooms - Get all rooms ====================
router.get('/', async (req, res) => {
    try {
        console.log('Fetching all rooms...');

        const rooms = await Room.findAll({
            include: [{ model: RoomType }],
            order: [['room_number', 'ASC']]
        });

        console.log(`Found ${rooms.length} rooms`);

        const formattedRooms = rooms.map(room => {
            const roomData = room.toJSON();
            const roomType = roomData.RoomType;
            const roomNotes = parseRoomNotes(roomData.notes);
            const roomTypeName = roomType?.name || 'Standard Room';

            // Get image for this specific room
            let imageUrl = roomImages[roomData.room_number];

            // If still no image, use fallback by room type
            if (!imageUrl) {
                imageUrl = fallbackImages[roomTypeName] || fallbackImages['Standard Room'];
            }

            // Parse amenities
            const amenities = parseAmenities(roomType?.amenities);

            // Determine bed type and room size based on room type
            let bedType = 'Queen Bed';
            let roomSize = 28;
            if (roomTypeName === 'Executive Suite') {
                bedType = 'King Bed';
                roomSize = 55;
            } else if (roomTypeName === 'Deluxe Room') {
                bedType = 'King Bed';
                roomSize = 38;
            }

            return {
                id: roomData.id,
                room_number: roomData.room_number,
                floor: roomData.floor,
                status: roomData.status,
                unique_description: roomNotes.description,
                view: roomNotes.view,
                special_feature: roomNotes.specialFeature,
                bed_type: bedType,
                room_size: roomSize,
                RoomType: roomType ? {
                    id: roomType.id,
                    name: roomType.name,
                    capacity: roomType.capacity,
                    base_price: roomType.base_price,
                    amenities: amenities
                } : null,
                image: imageUrl
            };
        });

        res.json({
            success: true,
            count: formattedRooms.length,
            rooms: formattedRooms
        });

    } catch (error) {
        console.error('Error in /api/rooms:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==================== GET /api/rooms/:id - Get single room by ID ====================
router.get('/:id', async (req, res) => {
    try {
        const roomId = parseInt(req.params.id);
        console.log(`Fetching room with ID: ${roomId}`);
        
        const room = await Room.findByPk(roomId, {
            include: [{ model: RoomType }]
        });
        
        if (!room) {
            console.log(`Room with ID ${roomId} not found`);
            return res.status(404).json({
                success: false,
                error: 'Room not found'
            });
        }
        
        const roomData = room.toJSON();
        const roomType = roomData.RoomType;
        const roomNotes = parseRoomNotes(roomData.notes);
        const roomTypeName = roomType?.name || 'Standard Room';
        
        // Get image for this specific room
        let imageUrl = roomImages[roomData.room_number];
        if (!imageUrl) {
            imageUrl = fallbackImages[roomTypeName] || fallbackImages['Standard Room'];
        }
        
        // Parse amenities
        const amenities = parseAmenities(roomType?.amenities);
        
        // Determine bed type and room size
        let bedType = 'Queen Bed';
        let roomSize = 28;
        if (roomTypeName === 'Executive Suite') {
            bedType = 'King Bed';
            roomSize = 55;
        } else if (roomTypeName === 'Deluxe Room') {
            bedType = 'King Bed';
            roomSize = 38;
        }
        
        const formattedRoom = {
            id: roomData.id,
            room_number: roomData.room_number,
            floor: roomData.floor,
            status: roomData.status,
            unique_description: roomNotes.description,
            view: roomNotes.view,
            special_feature: roomNotes.specialFeature,
            bed_type: bedType,
            room_size: roomSize,
            RoomType: roomType ? {
                id: roomType.id,
                name: roomType.name,
                description: roomType.description,
                capacity: roomType.capacity,
                base_price: roomType.base_price,
                amenities: amenities
            } : null,
            image: imageUrl
        };
        
        res.json({
            success: true,
            room: formattedRoom
        });
        
    } catch (error) {
        console.error('Error in /api/rooms/:id:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;