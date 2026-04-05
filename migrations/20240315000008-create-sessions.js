'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('session', {
            sid: {
                type: Sequelize.STRING,
                primaryKey: true
            },
            sess: {
                type: Sequelize.JSON,
                allowNull: false
            },
            expire: {
                type: Sequelize.DATE,
                allowNull: false
            }
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('session');
    }
};