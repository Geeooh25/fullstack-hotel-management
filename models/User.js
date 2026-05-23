const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcrypt');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
            notEmpty: true
        }
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    google_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true
    },
    first_name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    last_name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    avatar: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    email_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    // Add these fields to your User model
failed_login_attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
},
locked_until: {
    type: DataTypes.DATE,
    allowNull: true
},
last_login_ip: {
    type: DataTypes.STRING(45),
    allowNull: true
},
last_login_device: {
    type: DataTypes.TEXT,
    allowNull: true
},
password_reset_token: {
    type: DataTypes.STRING(255),
    allowNull: true
},
password_reset_expires: {
    type: DataTypes.DATE,
    allowNull: true
},
    // roles
role: {
    type: DataTypes.ENUM('super_admin', 'admin', 'receptionist', 'housekeeping', 'spa_staff', 'menu_manager', 'concierge', 'accountant', 'guest_relations', 'guest'),
    defaultValue: 'guest'
},
permissions: {
    type: DataTypes.JSON,
    defaultValue: {
        manage_bookings: false,
        manage_rooms: false,
        manage_guests: false,
        manage_staff: false,
        view_reports: false,
        manage_settings: false,
        manage_menu: false,
        manage_services: false,
        manage_requests: false,
        manage_spa: false
    }
},
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    status: {
        type: DataTypes.STRING(20),
        defaultValue: 'active'
    },
    last_login: {
        type: DataTypes.DATE,
        allowNull: true
    },
    reset_token: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    reset_token_expires: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
        beforeCreate: async (user) => {
            if (user.password) {
                user.password = await bcrypt.hash(user.password, 10);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password') && user.password) {
                user.password = await bcrypt.hash(user.password, 10);
            }
        }
    }
});

// Instance method to check password
User.prototype.validatePassword = async function(password) {
    if (!this.password) return false;
    return await bcrypt.compare(password, this.password);
};

User.prototype.getFullName = function() {
    return `${this.first_name} ${this.last_name}`;
};

User.findByEmail = async function(email) {
    return await this.findOne({ where: { email } });
};

module.exports = User;