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
    password_hash: {
        type: DataTypes.STRING(255),
        allowNull: true  // Changed to true for Google users (no password)
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
    role: {
        type: DataTypes.ENUM('admin', 'receptionist', 'housekeeping', 'guest'),
        defaultValue: 'guest'  // Changed default to guest
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
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
    hooks: {
        beforeCreate: async (user) => {
            if (user.password_hash) {
                user.password_hash = await bcrypt.hash(user.password_hash, 10);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password_hash') && user.password_hash) {
                user.password_hash = await bcrypt.hash(user.password_hash, 10);
            }
        }
    }
});

// Instance method to check password
User.prototype.validatePassword = async function(password) {
    if (!this.password_hash) return false;
    return await bcrypt.compare(password, this.password_hash);
};

// Instance method to get full name
User.prototype.getFullName = function() {
    return `${this.first_name} ${this.last_name}`;
};

// Class method to find by email
User.findByEmail = async function(email) {
    return await this.findOne({ where: { email } });
};

// Class method to find or create Google user
User.findOrCreateGoogleUser = async function(profile) {
    const user = await this.findOne({ where: { google_id: profile.id } });
    if (user) return user;
    
    // Check if email exists (user might have signed up with email before)
    const existingUser = await this.findOne({ where: { email: profile.emails[0].value } });
    if (existingUser) {
        existingUser.google_id = profile.id;
        existingUser.avatar = profile.photos?.[0]?.value;
        await existingUser.save();
        return existingUser;
    }
    
    // Create new user
    const nameParts = profile.displayName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    return await this.create({
        email: profile.emails[0].value,
        google_id: profile.id,
        first_name: firstName,
        last_name: lastName,
        avatar: profile.photos?.[0]?.value,
        email_verified: true,
        role: 'guest'
    });
};

module.exports = User;