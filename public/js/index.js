document.addEventListener('DOMContentLoaded', function() {
    loadReviews();
    loadFeaturedRooms();
});

function loadReviews() {
    const reviews = [
        { letter: "B", rating: "4.9/5 ★", stars: 5, platform: "Booking", count: "3.5K" },
        { letter: "C", rating: "5/5 ★", stars: 5, platform: "Agoda", count: "4.1K" },
        { letter: "D", rating: "4.8/5 ★", stars: 4, platform: "Tripadvisor", count: "2.4K" }
    ];
    
    const container = document.getElementById('reviews-container');
    let html = '';
    
    reviews.forEach(review => {
        html += `
            <div class="review-card">
                <div class="letter">${review.letter}</div>
                <div class="rating">${review.rating}</div>
                <div class="stars">${'★'.repeat(review.stars)}</div>
                <div class="platform">${review.platform}</div>
                <div class="review-count">${review.count} Reviews</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

async function loadFeaturedRooms() {
    const container = document.getElementById('rooms-container');
    
    try {
        const response = await fetch('/api/rooms');
        const data = await response.json();
        
        if (data.success && data.rooms && data.rooms.length > 0) {
            const featuredRooms = data.rooms.slice(0, 3);
            displayRooms(featuredRooms);
        } else {
            container.innerHTML = '<div class="col-12 text-center"><p>No rooms available at the moment.</p></div>';
        }
    } catch (error) {
        console.error('Error loading rooms:', error);
        container.innerHTML = '<div class="col-12 text-center"><p class="text-muted">Unable to load rooms. Please check back later.</p></div>';
    }
}

function displayRooms(rooms) {
    const container = document.getElementById('rooms-container');
    
    if (!rooms || rooms.length === 0) {
        container.innerHTML = '<div class="col-12 text-center"><p>No rooms available.</p></div>';
        return;
    }
    
    let html = '';
    rooms.forEach(room => {
        const roomType = room.RoomType || {};
        const imageUrl = roomType.images && roomType.images[0] 
            ? roomType.images[0] 
            : 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800';
        
        html += `
            <div class="col-md-4 mb-4">
                <div class="room-card">
                    <img src="${imageUrl}" alt="${roomType.name}" loading="lazy">
                    <div class="room-content">
                        <div class="price">$${roomType.base_price || 129} <span>/ NIGHT</span></div>
                        <h3>${roomType.name || 'Standard room'}</h3>
                        <p>${(roomType.description || 'Cozy and modern, this room offers essential amenities for a comfortable stay.').substring(0, 100)}...</p>
                        <ul class="room-features">
                            <li><i class="fas fa-arrows-alt"></i> ROOM SIZE ${roomType.capacity * 10 || 28} M²</li>
                            <li><i class="fas fa-bed"></i> ${roomType.name === 'Executive Suite' ? 'KING BED' : 'QUEEN BED'}</li>
                            <li><i class="fas fa-user-friends"></i> ${roomType.capacity || 2} ADULTS - ${Math.floor(roomType.capacity / 2) || 1} CHILD</li>
                            <li><i class="fas fa-eye"></i> CITY VIEW</li>
                            <li><i class="fas fa-smoking-ban"></i> SMOKING - NO</li>
                            <li><i class="fas fa-coffee"></i> BREAKFAST - YES</li>
                        </ul>
                        <a href="/room-detail.html?id=${room.id}" class="btn-gold w-100 text-center" style="display: block;">Book Now</a>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}