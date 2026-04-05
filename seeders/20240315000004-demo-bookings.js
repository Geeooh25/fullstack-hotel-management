'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);
        
        await queryInterface.bulkInsert('bookings', [
            {
                booking_reference: 'BKG-202403-1001',
                guest_id: 1,
                room_id: 1,
                check_in: today.toISOString().split('T')[0],
                check_out: nextWeek.toISOString().split('T')[0],
                adults: 2,
                children: 0,
                total_nights: 7,
                subtotal: 2093.00,
                tax: 261.63,
                total_amount: 2354.63,
                deposit_paid: 470.93,
                remaining_balance: 1883.70,
                status: 'confirmed',
                payment_status: 'deposit',
                source: 'online',
                confirmed_at: new Date(),
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                booking_reference: 'BKG-202403-1002',
                guest_id: 2,
                room_id: 10,
                check_in: today.toISOString().split('T')[0],
                check_out: nextWeek.toISOString().split('T')[0],
                adults: 1,
                children: 0,
                total_nights: 7,
                subtotal: 1113.00,
                tax: 139.13,
                total_amount: 1252.13,
                deposit_paid: 250.43,
                remaining_balance: 1001.70,
                status: 'confirmed',
                payment_status: 'deposit',
                source: 'online',
                confirmed_at: new Date(),
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                booking_reference: 'BKG-202403-1003',
                guest_id: 3,
                room_id: 5,
                check_in: lastWeek.toISOString().split('T')[0],
                check_out: today.toISOString().split('T')[0],
                adults: 2,
                children: 0,
                total_nights: 7,
                subtotal: 2793.00,
                tax: 349.13,
                total_amount: 3142.13,
                deposit_paid: 3142.13,
                remaining_balance: 0,
                status: 'checked_out',
                payment_status: 'paid',
                source: 'online',
                confirmed_at: new Date(lastWeek),
                checked_in_at: new Date(lastWeek),
                checked_out_at: new Date(),
                created_at: new Date(lastWeek),
                updated_at: new Date()
            },
            {
                booking_reference: 'BKG-202403-1004',
                guest_id: 4,
                room_id: 15,
                check_in: lastWeek.toISOString().split('T')[0],
                check_out: today.toISOString().split('T')[0],
                adults: 4,
                children: 2,
                total_nights: 7,
                subtotal: 3493.00,
                tax: 436.63,
                total_amount: 3929.63,
                deposit_paid: 3929.63,
                remaining_balance: 0,
                status: 'checked_out',
                payment_status: 'paid',
                source: 'online',
                confirmed_at: new Date(lastWeek),
                checked_in_at: new Date(lastWeek),
                checked_out_at: new Date(),
                created_at: new Date(lastWeek),
                updated_at: new Date()
            },
            {
                booking_reference: 'BKG-202403-1005',
                guest_id: 5,
                room_id: 17,
                check_in: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                check_out: new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                adults: 2,
                children: 0,
                total_nights: 7,
                subtotal: 6293.00,
                tax: 786.63,
                total_amount: 7079.63,
                deposit_paid: 1415.93,
                remaining_balance: 5663.70,
                status: 'confirmed',
                payment_status: 'deposit',
                source: 'online',
                confirmed_at: new Date(),
                created_at: new Date(),
                updated_at: new Date()
            }
        ]);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.bulkDelete('bookings', null, {});
    }
};