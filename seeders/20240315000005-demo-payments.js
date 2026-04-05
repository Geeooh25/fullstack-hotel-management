'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.bulkInsert('payments', [
            {
                booking_id: 1,
                amount: 470.93,
                payment_method: 'card',
                status: 'succeeded',
                transaction_id: 'pi_1234567890',
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                booking_id: 2,
                amount: 250.43,
                payment_method: 'card',
                status: 'succeeded',
                transaction_id: 'pi_1234567891',
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                booking_id: 3,
                amount: 3142.13,
                payment_method: 'card',
                status: 'succeeded',
                transaction_id: 'pi_1234567892',
                created_at: new Date(new Date().setDate(new Date().getDate() - 7)),
                updated_at: new Date(new Date().setDate(new Date().getDate() - 7))
            },
            {
                booking_id: 4,
                amount: 3929.63,
                payment_method: 'card',
                status: 'succeeded',
                transaction_id: 'pi_1234567893',
                created_at: new Date(new Date().setDate(new Date().getDate() - 7)),
                updated_at: new Date(new Date().setDate(new Date().getDate() - 7))
            },
            {
                booking_id: 5,
                amount: 1415.93,
                payment_method: 'card',
                status: 'succeeded',
                transaction_id: 'pi_1234567894',
                created_at: new Date(),
                updated_at: new Date()
            }
        ]);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.bulkDelete('payments', null, {});
    }
};