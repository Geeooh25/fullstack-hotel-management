// Gallery Data
const galleryImages = [
    // Rooms
    { src: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800', category: 'rooms', title: 'Deluxe Suite', caption: 'Spacious suite with ocean view and modern amenities' },
    { src: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800', category: 'rooms', title: 'Executive Room', caption: 'Elegant room with premium furnishings and city view' },
    { src: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800', category: 'rooms', title: 'Presidential Suite', caption: 'Ultimate luxury with separate living area and panoramic views' },
    { src: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800', category: 'rooms', title: 'Family Suite', caption: 'Perfect for families with two bedrooms and living area' },
    
    // Dining
    { src: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800', category: 'dining', title: 'Fine Dining Restaurant', caption: 'Award-winning cuisine prepared by master chefs' },
    { src: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800', category: 'dining', title: 'Rooftop Bar', caption: 'Enjoy signature cocktails with stunning city views' },
    { src: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800', category: 'dining', title: 'Breakfast Buffet', caption: 'Start your day with our extensive breakfast selection' },
    
    // Spa
    { src: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800', category: 'spa', title: 'Luxury Spa', caption: 'Rejuvenate with our signature treatments and therapies' },
    { src: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=800', category: 'spa', title: 'Massage Room', caption: 'Professional therapists for ultimate relaxation' },
    { src: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800', category: 'spa', title: 'Yoga Studio', caption: 'Daily yoga and meditation sessions' },
    
    // Pool
    { src: 'https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?w=800', category: 'pool', title: 'Infinity Pool', caption: 'Stunning pool with breathtaking city views' },
    { src: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800', category: 'pool', title: 'Poolside Lounge', caption: 'Relax by the pool with cabana service' },
    
    // Events
    { src: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800', category: 'events', title: 'Wedding Venue', caption: 'Perfect setting for your special day' },
    { src: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800', category: 'events', title: 'Conference Hall', caption: 'State-of-the-art facilities for business events' }
];

let currentFilter = 'all';

// Load gallery on page load
document.addEventListener('DOMContentLoaded', () => {
    loadGallery();
    setupFilters();
});

function loadGallery() {
    const container = document.getElementById('gallery-grid');
    
    const filteredImages = currentFilter === 'all' 
        ? galleryImages 
        : galleryImages.filter(img => img.category === currentFilter);
    
    if (filteredImages.length === 0) {
        container.innerHTML = '<div class="col-12 text-center py-5"><p>No images found in this category.</p></div>';
        return;
    }
    
    let html = '';
    filteredImages.forEach((image, index) => {
        html += `
            <div class="col-md-4">
                <div class="gallery-item" onclick="openModal(${index})">
                    <img src="${image.src}" alt="${image.title}" loading="lazy">
                    <div class="gallery-overlay">
                        <h4>${image.title}</h4>
                        <p>${image.caption}</p>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function setupFilters() {
    const filters = document.querySelectorAll('.filter-btn');
    filters.forEach(btn => {
        btn.addEventListener('click', () => {
            filters.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            loadGallery();
        });
    });
}

function openModal(index) {
    const filteredImages = currentFilter === 'all' 
        ? galleryImages 
        : galleryImages.filter(img => img.category === currentFilter);
    
    const image = filteredImages[index];
    
    document.getElementById('modalTitle').textContent = image.title;
    document.getElementById('modalImage').src = image.src;
    document.getElementById('modalCaption').textContent = image.caption;
    
    const modal = new bootstrap.Modal(document.getElementById('imageModal'));
    modal.show();
}