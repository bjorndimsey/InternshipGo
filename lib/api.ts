// API configuration and service functions
const API_BASE_URL = 'http://localhost:3001/api';

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  user?: T;
  coordinators?: T;
  coordinator?: T;
  companies?: T;
  applications?: T;
  student?: T;
  interns?: T;
  events?: T;
  event?: T;
  data?: T;
  errors?: string[];
  error?: string;
}

interface RegisterData {
  userType: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
  idNumber?: string;
  age?: string;
  year?: string;
  dateOfBirth?: string;
  program?: string;
  major?: string;
  address?: string;
  companyName?: string;
  industry?: string;
  phoneNumber?: string;
}

interface Coordinator {
  id: string;
  userId: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  program: string;
  address: string;
  profilePicture?: string;
  status: 'active' | 'inactive';
  joinDate: string;
  isAdminCoordinator: boolean;
  adminId?: string;
  adminPermissions?: {
    can_manage_coordinators: boolean;
    can_manage_interns: boolean;
    can_manage_companies: boolean;
    can_view_reports: boolean;
    can_manage_events?: boolean;
    can_manage_notifications?: boolean;
  };
  assignedInterns: number;
  university: string;
  department: string;
}

interface CreateCoordinatorData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  program: string;
  address: string;
  password: string;
}

interface UpdateCoordinatorData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  program?: string;
  address?: string;
  isActive?: boolean;
}

class ApiService {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    isFormData: boolean = false
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: isFormData ? {} : {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Register a new user
  async register(data: RegisterData): Promise<ApiResponse> {
    return this.makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Login user
  async login(email: string, password: string): Promise<ApiResponse> {
    return this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // Get user profile
  async getProfile(userId: string): Promise<ApiResponse> {
    return this.makeRequest(`/auth/profile/${userId}`);
  }

  // Check if Google user exists
  async checkGoogleUser(email: string): Promise<ApiResponse> {
    return this.makeRequest('/auth/check-google-user', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: string; message: string }> {
    const response = await fetch(`${this.baseURL.replace('/api', '')}/health`);
    return response.json();
  }

  // Coordinator methods
  async getCoordinators(): Promise<ApiResponse<Coordinator[]>> {
    return this.makeRequest<Coordinator[]>('/coordinators');
  }

  async getCoordinatorsWithMOA(companyId?: string): Promise<ApiResponse<any[]>> {
    const url = companyId ? `/coordinators/with-moa?companyId=${companyId}` : '/coordinators/with-moa';
    return this.makeRequest<any[]>(url);
  }

  async getCoordinator(id: string): Promise<ApiResponse<Coordinator>> {
    return this.makeRequest<Coordinator>(`/coordinators/${id}`);
  }

  async createCoordinator(data: CreateCoordinatorData): Promise<ApiResponse<Coordinator>> {
    return this.makeRequest<Coordinator>('/coordinators', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCoordinator(id: string, data: UpdateCoordinatorData): Promise<ApiResponse> {
    return this.makeRequest(`/coordinators/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCoordinator(id: string): Promise<ApiResponse> {
    return this.makeRequest(`/coordinators/${id}`, {
      method: 'DELETE',
    });
  }

  async toggleCoordinatorAdminStatus(id: string, isAdmin: boolean, assignedBy?: number): Promise<ApiResponse> {
    return this.makeRequest(`/coordinators/${id}/admin`, {
      method: 'PUT',
      body: JSON.stringify({ isAdmin, assignedBy }),
    });
  }

  // Admin Coordinator Profile
  async getAdminCoordinatorProfile(userId: string): Promise<ApiResponse> {
    return this.makeRequest(`/coordinators/admin-profile/${userId}`);
  }

  // Companies
  async getCompanies(): Promise<ApiResponse> {
    return this.makeRequest('/companies');
  }

  async getAllCompanies(): Promise<ApiResponse> {
    return this.makeRequest('/companies');
  }

  // Student search and intern management
  async searchStudent(searchParams: { email?: string; studentId?: string }): Promise<ApiResponse> {
    return this.makeRequest('/students/search', {
      method: 'POST',
      body: JSON.stringify(searchParams)
    });
  }

  async addStudentAsIntern(data: { studentId: string; schoolYear: string; coordinatorId: string }): Promise<ApiResponse> {
    return this.makeRequest('/interns/add', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getCoordinatorInterns(coordinatorId: string): Promise<ApiResponse> {
    return this.makeRequest(`/interns/coordinator/${coordinatorId}`);
  }

  async getCompany(id: string): Promise<ApiResponse> {
    return this.makeRequest(`/companies/${id}`);
  }

  async updateCompanyMOA(id: string, moaUrl: string, moaPublicId: string, uploadedBy: string): Promise<ApiResponse> {
    return this.makeRequest(`/companies/${id}/moa`, {
      method: 'PUT',
      body: JSON.stringify({
        moaUrl,
        moaPublicId,
        uploadedBy
      }),
    });
  }

  async updatePartnershipStatus(id: string, status: string, approvedBy: string): Promise<ApiResponse> {
    return this.makeRequest(`/companies/${id}/partnership`, {
      method: 'PUT',
      body: JSON.stringify({
        status,
        approvedBy
      }),
    });
  }

  // Application methods
  async submitApplication(applicationData: {
    studentId: string;
    companyId: string;
    position: string;
    department?: string;
    coverLetter?: string;
    resumeUrl?: string;
    resumePublicId?: string;
    transcriptUrl?: string;
    transcriptPublicId?: string;
    expectedStartDate?: string;
    expectedEndDate?: string;
    availability?: string;
    motivation?: string;
  }): Promise<ApiResponse> {
    return this.makeRequest('/applications/submit', {
      method: 'POST',
      body: JSON.stringify(applicationData),
    });
  }

  async getStudentApplications(studentId: string): Promise<ApiResponse> {
    return this.makeRequest(`/applications/student/${studentId}`);
  }

  async getCompanyApplications(companyId: string): Promise<ApiResponse> {
    return this.makeRequest(`/applications/company/${companyId}`);
  }

  async getApplicationById(id: string): Promise<ApiResponse> {
    return this.makeRequest(`/applications/${id}`);
  }

  async updateApplicationStatus(id: string, status: string, notes?: string, reviewedBy?: string): Promise<ApiResponse> {
    return this.makeRequest(`/applications/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({
        status,
        notes,
        reviewedBy
      }),
    });
  }

  async getApprovedApplications(companyId: string): Promise<ApiResponse> {
    return this.makeRequest(`/applications/company/${companyId}/approved`);
  }

  async updateCoordinatorPartnershipStatus(id: string, status: string, approvedBy: string, companyId?: string): Promise<ApiResponse> {
    console.log('🔄 API Service: updateCoordinatorPartnershipStatus called with:', {
      id,
      status,
      approvedBy,
      companyId,
      url: `${this.baseURL}/coordinators/${id}/partnership`
    });
    
    try {
      const response = await this.makeRequest(`/coordinators/${id}/partnership`, {
        method: 'PUT',
        body: JSON.stringify({
          status,
          approvedBy,
          companyId
        }),
      });
      
      console.log('✅ API Service: updateCoordinatorPartnershipStatus response:', response);
      return response;
    } catch (error) {
      console.error('❌ API Service: updateCoordinatorPartnershipStatus error:', error);
      throw error;
    }
  }

  // Location methods
  async updateLocation(userId: string, latitude: number, longitude: number): Promise<ApiResponse> {
    return this.makeRequest('/auth/update-location', {
      method: 'POST',
      body: JSON.stringify({ userId, latitude, longitude }),
    });
  }

  async getUserLocations(): Promise<ApiResponse<any[]>> {
    return this.makeRequest<any[]>('/auth/locations');
  }

  // Events methods
  async getEvents(coordinatorId: string): Promise<ApiResponse> {
    return this.makeRequest(`/events/coordinator/${coordinatorId}`);
  }

  async getStudentEvents(studentId: string): Promise<ApiResponse> {
    return this.makeRequest(`/events/student/${studentId}`);
  }

  async createEvent(eventData: {
    title: string;
    description?: string;
    date: string;
    time: string;
    location?: string;
    type: string;
    maxAttendees?: number;
    coordinatorId: string;
  }): Promise<ApiResponse> {
    return this.makeRequest('/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  }

  async updateEvent(eventId: string, eventData: {
    title?: string;
    description?: string;
    date?: string;
    time?: string;
    location?: string;
    type?: string;
    maxAttendees?: number;
    status?: string;
  }): Promise<ApiResponse> {
    return this.makeRequest(`/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    });
  }

  async deleteEvent(eventId: string): Promise<ApiResponse> {
    return this.makeRequest(`/events/${eventId}`, {
      method: 'DELETE',
    });
  }

  async getEventsByDateRange(coordinatorId: string, startDate?: string, endDate?: string): Promise<ApiResponse> {
    const params = new URLSearchParams({ coordinatorId });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    return this.makeRequest(`/events/date-range?${params.toString()}`);
  }

  // Location Pictures API
  async getLocationPictures(userId: string): Promise<ApiResponse> {
    return this.makeRequest(`/users/${userId}/location-pictures`);
  }

  async uploadLocationPictures(userId: string, formData: FormData): Promise<ApiResponse> {
    return this.makeRequest(`/users/${userId}/location-pictures`, {
      method: 'POST',
      body: formData,
    }, true);
  }

  async deleteLocationPicture(pictureId: string): Promise<ApiResponse> {
    return this.makeRequest(`/users/location-pictures/${pictureId}`, {
      method: 'DELETE',
    });
  }
}

// Create and export API service instance
export const apiService = new ApiService();

// Export types for use in components
export type { ApiResponse, RegisterData, Coordinator, CreateCoordinatorData, UpdateCoordinatorData };
