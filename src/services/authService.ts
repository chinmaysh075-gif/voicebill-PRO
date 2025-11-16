export interface User {
  id: string;
  username: string;
  role: 'cashier' | 'manager' | 'admin';
  name: string;
  avatar?: string;
}

// Mock users database
const MOCK_USERS: (User & { password: string })[] = [
  {
    id: '1',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    name: 'System Administrator'
  },
  {
    id: '2',
    username: 'cashier1',
    password: 'cash123',
    role: 'cashier',
    name: 'John Smith'
  },
  {
    id: '3',
    username: 'cashier2',
    password: 'cash123',
    role: 'cashier',
    name: 'Sarah Johnson'
  },
  {
    id: '4',
    username: 'manager',
    password: 'mgr123',
    role: 'manager',
    name: 'Mike Wilson'
  }
];

class AuthService {
  private currentUser: User | null = null;
  private readonly SESSION_KEY = 'billing_system_session';

  constructor() {
    // Check for existing session on initialization
    this.loadSession();
  }

  async login(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const userRecord = MOCK_USERS.find(u => u.username === username && u.password === password);
    
    if (userRecord) {
      const user: User = {
        id: userRecord.id,
        username: userRecord.username,
        role: userRecord.role,
        name: userRecord.name,
        avatar: userRecord.avatar
      };
      
      this.currentUser = user;
      this.saveSession(user);
      
      return { success: true, user };
    }
    
    return { success: false, error: 'Invalid username or password' };
  }

  logout(): void {
    this.currentUser = null;
    localStorage.removeItem(this.SESSION_KEY);
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  hasRole(role: 'cashier' | 'manager' | 'admin'): boolean {
    if (!this.currentUser) return false;
    
    // Admin has access to everything
    if (this.currentUser.role === 'admin') return true;
    
    // Manager has access to cashier functions
    if (this.currentUser.role === 'manager' && role === 'cashier') return true;
    
    // Exact role match
    return this.currentUser.role === role;
  }

  private saveSession(user: User): void {
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
  }

  private loadSession(): void {
    try {
      const sessionData = localStorage.getItem(this.SESSION_KEY);
      if (sessionData) {
        this.currentUser = JSON.parse(sessionData);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      localStorage.removeItem(this.SESSION_KEY);
    }
  }

  // Get demo credentials for testing
  getDemoCredentials() {
    return [
      { username: 'admin', password: 'admin123', role: 'Admin' },
      { username: 'cashier1', password: 'cash123', role: 'Cashier' },
      { username: 'manager', password: 'mgr123', role: 'Manager' }
    ];
  }
}

export const authService = new AuthService();