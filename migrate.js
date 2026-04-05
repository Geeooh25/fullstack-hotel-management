const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database('./database.sqlite');

const migrations = `
-- Create amenities table
CREATE TABLE IF NOT EXISTS amenities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(20) NOT NULL DEFAULT 'free',
    description TEXT NOT NULL,
    short_description VARCHAR(255) NOT NULL,
    icon VARCHAR(100) DEFAULT 'fas fa-star',
    hours VARCHAR(200) DEFAULT '24/7',
    location VARCHAR(255) DEFAULT 'Main Building',
    additional_info TEXT,
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create menu_categories table
CREATE TABLE IF NOT EXISTS menu_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amenity_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (amenity_id) REFERENCES amenities(id) ON DELETE CASCADE
);

-- Create menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    duration_minutes INTEGER,
    requires_appointment BOOLEAN DEFAULT 0,
    is_available BOOLEAN DEFAULT 1,
    image_url VARCHAR(500),
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES menu_categories(id) ON DELETE CASCADE
);

-- Create cart_items table
CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id VARCHAR(255),
    guest_email VARCHAR(255),
    menu_item_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    special_instructions TEXT,
    appointment_time DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
);

-- Create booking_services table
CREATE TABLE IF NOT EXISTS booking_services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL,
    menu_item_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    price_at_time DECIMAL(10,2) NOT NULL,
    special_instructions TEXT,
    appointment_time DATETIME,
    status VARCHAR(20) DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
);

-- Create request_submissions table
CREATE TABLE IF NOT EXISTS request_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amenity_id INTEGER NOT NULL,
    guest_name VARCHAR(200) NOT NULL,
    guest_email VARCHAR(255) NOT NULL,
    guest_phone VARCHAR(50) NOT NULL,
    booking_reference VARCHAR(50),
    request_type VARCHAR(100),
    request_details TEXT,
    preferred_date DATETIME,
    number_of_people INTEGER,
    number_of_tickets INTEGER,
    seating_preference VARCHAR(100),
    tour_name VARCHAR(200),
    event_name VARCHAR(200),
    status VARCHAR(20) DEFAULT 'pending',
    admin_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (amenity_id) REFERENCES amenities(id) ON DELETE CASCADE
);

-- Insert default amenities
INSERT OR IGNORE INTO amenities (name, slug, category, description, short_description, icon, hours, location, display_order) VALUES 
('High Speed WiFi', 'wifi', 'free', 'Enjoy seamless high-speed internet access throughout the hotel. Perfect for business travelers and streaming entertainment.', 'Free high-speed WiFi throughout the hotel', 'fas fa-wifi', '24/7', 'Entire Hotel', 1),
('Fitness Center', 'fitness', 'free', 'Stay active with state-of-the-art fitness equipment in our modern gym. Personal trainers available upon request.', 'Modern gym with premium equipment', 'fas fa-dumbbell', '6:00 AM - 10:00 PM', '2nd Floor', 2),
('Swimming Pool', 'pool', 'free', 'Refresh and unwind in our pristine outdoor swimming pool. Lounge area with cabanas and poolside service.', 'Outdoor pool with cabanas', 'fas fa-swimming-pool', '7:00 AM - 9:00 PM', 'Rooftop', 3),
('Kids Club', 'kids-club', 'free', 'Supervised activities and play areas for children of all ages. Arts and crafts, games, and movie nights.', 'Fun activities for kids', 'fas fa-children', '9:00 AM - 6:00 PM', 'Ground Floor', 4),
('Restaurant & Bar', 'restaurant', 'paid', 'Savour gourmet dishes and cocktails at our elegant restaurant and bar. International cuisine prepared by award-winning chefs.', 'Fine dining with international cuisine', 'fas fa-utensils', '6:00 AM - 11:00 PM', 'Lobby Level', 5),
('Spa & Wellness', 'spa', 'paid', 'Rejuvenate with our signature massages, facials, and wellness treatments. Relax in our steam room and sauna.', 'Luxury spa treatments', 'fas fa-spa', '9:00 AM - 9:00 PM', 'Lower Level', 6),
('Parking', 'parking', 'paid', 'Ample and secure parking space provided for all hotel guests. Valet service available 24/7.', 'Secure parking with valet option', 'fas fa-parking', '24/7', 'Basement', 7),
('Business Center', 'business-center', 'paid', 'Fully equipped meeting rooms and business facilities. High-speed internet, printing, and secretarial services.', 'Meeting rooms and business services', 'fas fa-business-time', '8:00 AM - 8:00 PM', '1st Floor', 8),
('Concierge', 'concierge', 'request', 'Personalized assistance for restaurant reservations, tour bookings, and special requests available 24/7.', '24/7 personalized concierge service', 'fas fa-concierge-bell', '24/7', 'Lobby', 9);

-- Insert sample menu categories for Restaurant
INSERT OR IGNORE INTO menu_categories (amenity_id, name, display_order) VALUES 
((SELECT id FROM amenities WHERE slug = 'restaurant'), 'Breakfast', 1),
((SELECT id FROM amenities WHERE slug = 'restaurant'), 'Lunch', 2),
((SELECT id FROM amenities WHERE slug = 'restaurant'), 'Dinner', 3),
((SELECT id FROM amenities WHERE slug = 'restaurant'), 'Beverages', 4);

-- Insert sample menu items for Breakfast
INSERT OR IGNORE INTO menu_items (category_id, name, description, price, display_order) VALUES 
((SELECT id FROM menu_categories WHERE name = 'Breakfast' AND amenity_id = (SELECT id FROM amenities WHERE slug = 'restaurant')), 'Continental Breakfast', 'Fresh pastries, fruits, yogurt, and coffee', 15.99, 1),
((SELECT id FROM menu_categories WHERE name = 'Breakfast' AND amenity_id = (SELECT id FROM amenities WHERE slug = 'restaurant')), 'American Breakfast', 'Eggs, bacon, sausage, toast, and hash browns', 22.99, 2),
((SELECT id FROM menu_categories WHERE name = 'Breakfast' AND amenity_id = (SELECT id FROM amenities WHERE slug = 'restaurant')), 'Healthy Bowl', 'Quinoa, avocado, poached egg, and mixed greens', 18.99, 3);

-- Insert sample menu items for Lunch
INSERT OR IGNORE INTO menu_items (category_id, name, description, price, display_order) VALUES 
((SELECT id FROM menu_categories WHERE name = 'Lunch' AND amenity_id = (SELECT id FROM amenities WHERE slug = 'restaurant')), 'Caesar Salad', 'Romaine lettuce, parmesan, croutons, and Caesar dressing', 14.99, 1),
((SELECT id FROM menu_categories WHERE name = 'Lunch' AND amenity_id = (SELECT id FROM amenities WHERE slug = 'restaurant')), 'Club Sandwich', 'Triple-decker with turkey, bacon, lettuce, and tomato', 16.99, 2),
((SELECT id FROM menu_categories WHERE name = 'Lunch' AND amenity_id = (SELECT id FROM amenities WHERE slug = 'restaurant')), 'Grilled Salmon', 'Fresh salmon with seasonal vegetables and rice', 28.99, 3);

-- Insert sample menu categories for Spa
INSERT OR IGNORE INTO menu_categories (amenity_id, name, display_order) VALUES 
((SELECT id FROM amenities WHERE slug = 'spa'), 'Massages', 1),
((SELECT id FROM amenities WHERE slug = 'spa'), 'Facials', 2);

-- Insert sample spa items
INSERT OR IGNORE INTO menu_items (category_id, name, description, price, duration_minutes, requires_appointment, display_order) VALUES 
((SELECT id FROM menu_categories WHERE name = 'Massages' AND amenity_id = (SELECT id FROM amenities WHERE slug = 'spa')), 'Swedish Massage', 'Relaxing full-body massage', 89.99, 60, 1, 1),
((SELECT id FROM menu_categories WHERE name = 'Massages' AND amenity_id = (SELECT id FROM amenities WHERE slug = 'spa')), 'Deep Tissue', 'Intense muscle relief', 109.99, 60, 1, 2),
((SELECT id FROM menu_categories WHERE name = 'Facials' AND amenity_id = (SELECT id FROM amenities WHERE slug = 'spa')), 'Hydrating Facial', 'Deep hydration for dry skin', 79.99, 45, 1, 1);
`;

console.log('🔄 Running database migration...');

db.exec(migrations, (err) => {
    if (err) {
        console.error('❌ Migration failed:', err.message);
    } else {
        console.log('✅ Migration completed successfully!');
        console.log('📋 New tables created:');
        console.log('   - amenities');
        console.log('   - menu_categories');
        console.log('   - menu_items');
        console.log('   - cart_items');
        console.log('   - booking_services');
        console.log('   - request_submissions');
        console.log('📦 Sample data inserted for restaurant and spa');
    }
    db.close();
});