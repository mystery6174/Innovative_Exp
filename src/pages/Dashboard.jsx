import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { LogOut, Calendar, MapPin, Plus, Search, X, Bell, Filter } from 'lucide-react'

export default function Dashboard({ session }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showCalendars, setShowCalendars] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [activeCategory, setActiveCategory] = useState('All')
  const [subscribedCalendars, setSubscribedCalendars] = useState([])
  
  // New event form state
  const [newEvent, setNewEvent] = useState({ title: '', description: '', location: '', price: 0, date: '', category: 'Social' })

  useEffect(() => {
    fetchEvents()

    // 🚀 UPGRADE: Real-time subscription to events table
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'events',
        },
        (payload) => {
          console.log('Real-time event received!', payload)
          // Add new event to the top of the list dynamically if it's not already there
          setEvents((currentEvents) => {
            if (currentEvents.some(event => event.id === payload.new.id)) {
              return currentEvents; // Already exists
            }
            return [payload.new, ...currentEvents];
          })
          // Trigger a notification
          setNotifications((prev) => [
            {
              id: Date.now(),
              message: `New Event Created: ${payload.new.title}`,
              time: 'Just now'
            },
            ...prev
          ])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      let query = supabase.from('events').select('*').order('id', { ascending: false })
      
      // If we had a category column in DB, we'd filter here. 
      // Since we don't want to break the existing DB schema, we filter on client side.
      const { data, error } = await query
        
      if (error) throw error
      
      if (activeCategory !== 'All') {
        // Simple mock filtering based on keywords in title/description
        const filtered = (data || []).filter(e => 
          (e.title + e.description).toLowerCase().includes(activeCategory.toLowerCase()) ||
          (activeCategory === 'Tech' && e.title.includes('Hack')) ||
          (activeCategory === 'Social' && e.title.includes('Swap')) ||
          (activeCategory === 'Music' && e.title.includes('Sukoon'))
        )
        setEvents(filtered)
      } else {
        setEvents(data || [])
      }
    } catch (error) {
      console.error('Error fetching events:', error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [activeCategory])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleSubscribe = (calName) => {
    if (subscribedCalendars.includes(calName)) return
    
    setSubscribedCalendars([...subscribedCalendars, calName])
    
    // Push notification
    setNotifications(prev => [{
      id: Date.now(),
      message: `Successfully synced ${calName} calendar!`,
      time: 'Just now'
    }, ...prev])
    
    // Add a mock synced event
    const syncedEvent = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      title: `${calName} Gathering`,
      description: `Automatically synced from your new subscription to ${calName}.`,
      location: 'Community Center',
      start_date: new Date(Date.now() + 86400000 * 3).toISOString(),
      price: 0,
      image: 'https://images.unsplash.com/photo-1511632765486-a01c80cf8cb4?w=800&q=80'
    }
    
    setEvents(current => [syncedEvent, ...current])
  }

  const handleCreateEvent = async (e) => {
    e.preventDefault()
    try {
      const eventToAdd = {
        title: newEvent.title,
        description: newEvent.description,
        location: newEvent.location,
        start_date: newEvent.date || new Date().toISOString(),
        price: parseInt(newEvent.price) || 0,
        image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80'
      }
      
      const { data, error } = await supabase
        .from('events')
        .insert([eventToAdd])
        .select()
        
      if (error) throw error
      
      if (data) {
        setEvents([data[0], ...events])
      }
      
      setShowModal(false)
      setNewEvent({ title: '', description: '', location: '', price: 0, date: '' })
    } catch (error) {
      console.error('Error creating event:', error.message)
      alert('Failed to create event!')
    }
  }

  return (
    <div className="container" style={{ position: 'relative' }}>
      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={28} style={{ color: 'var(--primary)' }} />
          <h2 style={{ marginBottom: 0 }}>NexusEvents</h2>
        </div>
        <div className="nav-links items-center">
          <button 
            className="btn btn-outline" 
            style={{ padding: '0.5rem', position: 'relative', border: 'none' }}
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={20} />
            {notifications.length > 0 && (
              <span style={{ position: 'absolute', top: '0', right: '0', background: '#ef4444', color: 'white', fontSize: '0.7rem', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {notifications.length}
              </span>
            )}
          </button>
          <span className="text-muted" style={{ marginRight: '1rem', marginLeft: '1rem' }}>{session.user.email}</span>
          <button onClick={handleSignOut} className="btn btn-outline" style={{ padding: '0.5rem 1rem' }}>
            <LogOut size={18} style={{ marginRight: '0.5rem' }} /> Sign Out
          </button>
        </div>
      </nav>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Discover Events</h1>
          <p className="text-muted">Explore popular events near you, browse by category, or check out some of the great community calendars.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center' }} onClick={() => setShowCalendars(true)}>
            <Calendar size={18} style={{ marginRight: '0.5rem' }} /> Community Calendars
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} style={{ marginRight: '0.5rem' }} /> Create Event
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ maxWidth: '400px', margin: 0, flex: 1 }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" className="form-input" placeholder="Search by category..." style={{ paddingLeft: '2.5rem' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Filter size={18} className="text-muted" style={{ marginRight: '0.5rem' }} />
          {['All', 'Tech', 'Music', 'Social', 'Educational'].map(cat => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                background: activeCategory === cat ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${activeCategory === cat ? 'var(--primary)' : 'var(--border)'}`,
                color: activeCategory === cat ? 'white' : 'var(--text-muted)',
                padding: '0.5rem 1rem',
                borderRadius: '99px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '0.875rem'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <h2 className="mt-4 mb-4">Events You Might Like</h2>
      
      {loading ? (
        <p>Loading events...</p>
      ) : (
        <div className="grid grid-cols-3">
          {events.map((event) => (
            <div key={event.id} className="glass event-card animate-fade-in" style={{ padding: '1rem' }}>
              <div 
                className="event-image-placeholder" 
                style={{ 
                  backgroundImage: `url(${event.image})`, 
                  backgroundSize: 'cover', 
                  backgroundPosition: 'center',
                  marginBottom: '1rem',
                  borderRadius: '12px'
                }}
              ></div>
              <div style={{ flex: 1, padding: '0 0.5rem' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '0.5rem' }}>
                  {new Date(event.start_date).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
                </div>
                <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>{event.title}</h3>
                <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{event.description}</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', padding: '1rem 0.5rem 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  <MapPin size={16} style={{ marginRight: '0.25rem' }} /> {event.location}
                </div>
                <div style={{ fontWeight: 'bold', color: 'white', background: 'rgba(99, 102, 241, 0.2)', padding: '0.25rem 0.75rem', borderRadius: '99px' }}>
                  {event.price === 0 ? 'Free' : `₹${event.price}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE EVENT MODAL */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="glass animate-fade-in" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative' }}>
            <button 
              onClick={() => setShowModal(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
            <h2 style={{ marginBottom: '1.5rem' }}>Host New Event</h2>
            <form onSubmit={handleCreateEvent}>
              <div className="form-group">
                <label className="form-label">Event Title</label>
                <input required type="text" className="form-input" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} placeholder="E.g. Yoga in the Park" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea required className="form-input" value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} placeholder="What is your event about?" rows={3} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input required type="text" className="form-input" value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} placeholder="Venue name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Price (₹)</label>
                  <input required type="number" min="0" className="form-input" value={newEvent.price} onChange={e => setNewEvent({...newEvent, price: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Date & Time</label>
                <input required type="datetime-local" className="form-input" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Publish Event</button>
            </form>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS DRAWER */}
      {showNotifications && (
        <div className="glass animate-fade-in" style={{ position: 'absolute', top: '5rem', right: '2rem', width: '320px', zIndex: 40, padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Notifications</h3>
            <button onClick={() => setShowNotifications(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
          </div>
          {notifications.length === 0 ? (
            <p className="text-muted" style={{ fontSize: '0.875rem', textAlign: 'center', margin: '2rem 0' }}>No new notifications</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {notifications.map(notif => (
                <div key={notif.id} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '3px solid var(--primary)' }}>
                  <p style={{ fontSize: '0.875rem', margin: 0 }}>{notif.message}</p>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{notif.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* COMMUNITY CALENDARS MODAL */}
      {showCalendars && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="glass animate-fade-in" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative' }}>
            <button 
              onClick={() => setShowCalendars(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center' }}>
              <Calendar size={24} style={{ marginRight: '0.5rem', color: 'var(--primary)' }} />
              Community Calendars
            </h2>
            <p className="text-muted" style={{ marginBottom: '2rem' }}>Subscribe to local community calendars to automatically sync events to your dashboard.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { name: 'Thane Tech Enthusiasts', members: '1,204' },
                { name: 'Mumbai Book Clubs', members: '856' },
                { name: 'Local Music Scene', members: '3,492' }
              ].map(cal => {
                const isSubscribed = subscribedCalendars.includes(cal.name)
                return (
                  <div key={cal.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div>
                      <h4 style={{ margin: '0 0 0.25rem 0' }}>{cal.name}</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cal.members} subscribers</span>
                    </div>
                    <button 
                      className={`btn ${isSubscribed ? 'btn-primary' : 'btn-outline'}`} 
                      style={{ padding: '0.25rem 1rem', fontSize: '0.875rem' }}
                      onClick={() => handleSubscribe(cal.name)}
                      disabled={isSubscribed}
                    >
                      {isSubscribed ? 'Subscribed' : 'Subscribe'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
