const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RoomType = sequelize.define('RoomType', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    capacity: {
        type: DataTypes.INTEGER,
        defaultValue: 2,
        allowNull: false
    },
    base_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    amenities: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: '["Free WiFi", "Flat-screen TV", "Air Conditioning"]',
        get() {
            const val = this.getDataValue('amenities');
            if (!val) return ['Free WiFi', 'Flat-screen TV', 'Air Conditioning'];
            try {
                const parsed = JSON.parse(val);
                return Array.isArray(parsed) ? parsed : ['Free WiFi', 'Flat-screen TV', 'Air Conditioning'];
            } catch (e) {
                return ['Free WiFi', 'Flat-screen TV', 'Air Conditioning'];
            }
        },
        set(val) {
            if (Array.isArray(val)) {
                this.setDataValue('amenities', JSON.stringify(val));
            } else {
                this.setDataValue('amenities', val);
            }
        }
    },
    images: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: '["https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800"]',
        get() {
            const val = this.getDataValue('images');
            if (!val) return ['https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800'];
            try {
                const parsed = JSON.parse(val);
                return Array.isArray(parsed) ? parsed : ['https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800'];
            } catch (e) {
                return ['https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800'];
            }
        },
        set(val) {
            if (Array.isArray(val)) {
                this.setDataValue('images', JSON.stringify(val));
            } else {
                this.setDataValue('images', val);
            }
        }
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'room_types',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = RoomType;