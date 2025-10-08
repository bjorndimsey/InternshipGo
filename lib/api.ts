// API configuration and service functions
const API_BASE_URL = 'http://localhost:3001/api';

interface ApiResponse<T = any> {
  success: boolean;
  message?: string | T;
  user?: T;
  coordinators?: T;
  coordinator?: T;
  companies?: T;
  applications?: T;
  student?: T;
  interns?: T;
  events?: T;
  requirements?: T;
  requirement?: T;
  event?: T;
  data?: T;
  favorites?: T;
  isFavorited?: boolean;
  users?: T;
  conversations?: T;
  conversationId?: string;
  messages?: T;
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
  campusAssignment?: 'in-campus' | 'off-campus';
  assignedBy?: string;
  assignedAt?: string;
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
    isFormData: boolean = false,
    retries: number = 3
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: isFormData ? {} : {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      mode: 'cors', // Explicitly set CORS mode
      credentials: 'include', // Include credentials for CORS
    };

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        console.log(`🌐 API Request (attempt ${attempt + 1}/${retries}):`, {
          url,
          method: options.method || 'GET',
          headers: defaultOptions.headers
        });

        const response = await fetch(url, { ...defaultOptions, ...options });
        
        console.log(`📡 API Response:`, {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        });

        // Handle different response types
        let data;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        if (!response.ok) {
          // Handle specific error cases
          if (response.status === 429) {
            const waitTime = Math.pow(2, attempt) * 1000 + Math.random() * 1000; // Exponential backoff with jitter
            console.log(`⏳ Rate limited. Waiting ${waitTime}ms before retry ${attempt + 1}/${retries}`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          
          if (response.status === 0) {
            throw new Error('Network error: Unable to connect to server. Please check if the server is running.');
          }
          
          if (response.status >= 500) {
            const waitTime = Math.pow(2, attempt) * 1000;
            console.log(`🔄 Server error ${response.status}. Waiting ${waitTime}ms before retry ${attempt + 1}/${retries}`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          
          throw new Error(data.message || data || `HTTP error! status: ${response.status}`);
        }

        return data;
      } catch (error) {
        console.error(`❌ API request failed (attempt ${attempt + 1}/${retries}):`, error);
        
        // Check if it's a network/CORS error
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          console.error('🌐 Network/CORS error detected. This might be due to:');
          console.error('  - Server not running');
          console.error('  - CORS policy blocking the request');
          console.error('  - Network connectivity issues');
        }
        
        // If this is the last attempt, throw the error
        if (attempt === retries - 1) {
          throw error;
        }
        
        // Wait before retrying with exponential backoff and jitter
        const waitTime = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        console.log(`⏳ Waiting ${waitTime}ms before retry ${attempt + 2}/${retries}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    throw new Error('All retry attempts failed');
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

  // Update user profile
  async updateProfile(userId: string, profileData: any): Promise<ApiResponse> {
    return this.makeRequest(`/auth/profile/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
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

  async deleteIntern(internId: string): Promise<ApiResponse> {
    return this.makeRequest(`/interns/${internId}`, {
      method: 'DELETE'
    });
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
    hoursOfInternship?: string;
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

  async getStudentCompanies(studentId: string): Promise<ApiResponse> {
    return this.makeRequest(`/companies/student/${studentId}`);
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

  // Requirements Management API
  async getStudentRequirements(studentId: string): Promise<ApiResponse> {
    return this.makeRequest(`/requirements/student/${studentId}`);
  }

  async createRequirement(requirementData: {
    name: string;
    description?: string;
    isRequired: boolean;
    dueDate?: string | null;
    coordinatorId: string;
    fileUrl?: string;
    fileName?: string;
  }): Promise<ApiResponse> {
    console.log('🔍 API SERVICE - createRequirement called with:', requirementData);
    const result = await this.makeRequest('/requirements', {
      method: 'POST',
      body: JSON.stringify(requirementData),
    });
    console.log('🔍 API SERVICE - createRequirement result:', result);
    return result;
  }

  async updateRequirement(requirementId: string, requirementData: {
    name?: string;
    description?: string;
    isRequired?: boolean;
    dueDate?: string | null;
    fileUrl?: string;
    fileName?: string;
  }): Promise<ApiResponse> {
    return this.makeRequest(`/requirements/${requirementId}`, {
      method: 'PUT',
      body: JSON.stringify(requirementData),
    });
  }

  async deleteRequirement(requirementId: string): Promise<ApiResponse> {
    return this.makeRequest(`/requirements/${requirementId}`, {
      method: 'DELETE',
    });
  }

  async updateStudentRequirement(studentId: string, requirementId: string, data: {
    completed?: boolean;
    fileUrl?: string;
    filePublicId?: string;
    notes?: string;
    coordinatorId?: string;
  }): Promise<ApiResponse> {
    const endpoint = `/requirements/student/${studentId}/${requirementId}`;
    console.log('🌐 API Call:', {
      endpoint,
      fullUrl: `${this.baseURL}${endpoint}`,
      method: 'PUT',
      data
    });
    
    return this.makeRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async uploadRequirementFile(studentId: string, requirementId: string, formData: FormData): Promise<ApiResponse> {
    return this.makeRequest(`/requirements/student/${studentId}/${requirementId}/upload`, {
      method: 'POST',
      body: formData,
    }, true);
  }

  async downloadRequirementFile(studentId: string, requirementId: string): Promise<ApiResponse> {
    return this.makeRequest(`/requirements/student/${studentId}/${requirementId}/download`);
  }

  async sendRequirementReminder(studentId: string, requirementId: string): Promise<ApiResponse> {
    return this.makeRequest(`/requirements/student/${studentId}/${requirementId}/remind`, {
      method: 'POST',
    });
  }

  async getRequirementsReport(coordinatorId: string, filters?: {
    studentId?: string;
    completed?: boolean;
    dueDateFrom?: string;
    dueDateTo?: string;
  }): Promise<ApiResponse> {
    const params = new URLSearchParams({ coordinatorId });
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    return this.makeRequest(`/requirements/report?${params.toString()}`);
  }

  // Student Submission API
  async submitRequirement(data: {
    studentId: string;
    requirementId: string;
    requirementName: string;
    requirementDescription?: string;
    isRequired: boolean;
    dueDate?: string;
    submittedFileUrl: string;
    submittedFilePublicId: string;
    submittedFileName: string;
    submittedFileSize: number;
    coordinatorId: string;
  }): Promise<ApiResponse> {
    return this.makeRequest('/submissions/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getStudentSubmissions(studentId: string): Promise<ApiResponse> {
    return this.makeRequest(`/submissions/student/${studentId}`);
  }

  async getCoordinatorSubmissions(coordinatorId: string, status?: string): Promise<ApiResponse> {
    const endpoint = status 
      ? `/submissions/coordinator/${coordinatorId}?status=${status}`
      : `/submissions/coordinator/${coordinatorId}`;
    return this.makeRequest(endpoint);
  }

  async getSubmissionStats(coordinatorId: string): Promise<ApiResponse> {
    return this.makeRequest(`/submissions/coordinator/${coordinatorId}/stats`);
  }

  async getSubmissionDetails(submissionId: string): Promise<ApiResponse> {
    return this.makeRequest(`/submissions/${submissionId}`);
  }

  async updateSubmissionStatus(submissionId: string, status: string, feedback?: string): Promise<ApiResponse> {
    return this.makeRequest(`/submissions/${submissionId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, feedback }),
    });
  }

  // Get requirements by coordinator
  async getCoordinatorRequirements(coordinatorId: string): Promise<ApiResponse> {
    return this.makeRequest(`/requirements/coordinator/${coordinatorId}`);
  }

  // Get coordinator profile by coordinators.id
  async getCoordinatorProfile(coordinatorId: string): Promise<ApiResponse> {
    return this.makeRequest(`/coordinators/profile/${coordinatorId}`);
  }

  // Get coordinator profile by user_id (returns coordinators.id)
  async getCoordinatorProfileByUserId(userId: string): Promise<ApiResponse> {
    return this.makeRequest(`/coordinators/profile-by-user/${userId}`);
  }

  // Get company profile by user_id (returns companies.id)
  async getCompanyProfileByUserId(userId: string): Promise<ApiResponse> {
    return this.makeRequest(`/companies/profile-by-user/${userId}`);
  }

  // Favorites API
  async addToFavorites(studentId: string, companyId: string): Promise<ApiResponse> {
    return this.makeRequest('/favorites/add', {
      method: 'POST',
      body: JSON.stringify({ studentId, companyId }),
    });
  }

  async removeFromFavorites(studentId: string, companyId: string): Promise<ApiResponse> {
    return this.makeRequest('/favorites/remove', {
      method: 'POST',
      body: JSON.stringify({ studentId, companyId }),
    });
  }

  async getStudentFavorites(studentId: string): Promise<ApiResponse> {
    return this.makeRequest(`/favorites/student/${studentId}`);
  }

  async checkFavoriteStatus(studentId: string, companyId: string): Promise<ApiResponse> {
    return this.makeRequest(`/favorites/check/${studentId}/${companyId}`);
  }

  async toggleFavorite(studentId: string, companyId: string): Promise<ApiResponse> {
    return this.makeRequest('/favorites/toggle', {
      method: 'POST',
      body: JSON.stringify({ studentId, companyId }),
    });
  }

  // Messaging API
  async searchUsers(userId: string, searchTerm: string): Promise<ApiResponse> {
    return this.makeRequest(`/messaging/search?searchTerm=${encodeURIComponent(searchTerm)}&userId=${userId}`);
  }

  async getConversations(userId: string): Promise<ApiResponse> {
    return this.makeRequest(`/messaging/conversations?userId=${userId}`);
  }

  async createDirectConversation(userId: string, participantId: string): Promise<ApiResponse> {
    return this.makeRequest(`/messaging/conversations/direct?userId=${userId}`, {
      method: 'POST',
      body: JSON.stringify({ participantId }),
    });
  }

  async createGroupConversation(userId: string, groupName: string, participantIds: string[], avatarUrl?: string): Promise<ApiResponse> {
    return this.makeRequest('/messaging/conversations/group', {
      method: 'POST',
      body: JSON.stringify({ userId, groupName, participantIds, avatarUrl }),
    });
  }

  async getMessages(userId: string, conversationId: string, page: number = 1, limit: number = 50): Promise<ApiResponse> {
    return this.makeRequest(`/messaging/conversations/${conversationId}/messages?userId=${userId}&page=${page}&limit=${limit}`);
  }

  async sendMessage(userId: string, conversationId: string, content: string, messageType: string = 'text', isImportant: boolean = false): Promise<ApiResponse> {
    return this.makeRequest(`/messaging/conversations/${conversationId}/messages?userId=${userId}`, {
      method: 'POST',
      body: JSON.stringify({ content, messageType, isImportant }),
    });
  }


  async updateGroupAvatar(userId: string, conversationId: string, avatarUrl: string): Promise<ApiResponse> {
    return this.makeRequest(`/messaging/conversations/${conversationId}/avatar?userId=${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ avatarUrl }),
    });
  }

  async deleteConversation(userId: string, conversationId: string): Promise<ApiResponse> {
    console.log('🔍 API SERVICE - deleteConversation called with:');
    console.log('  - userId:', userId);
    console.log('  - conversationId:', conversationId);
    console.log('  - URL:', `/messaging/conversations/${conversationId}?userId=${userId}`);
    
    const result = await this.makeRequest(`/messaging/conversations/${conversationId}?userId=${userId}`, {
      method: 'DELETE',
    });
    
    console.log('🔍 API SERVICE - deleteConversation result:', result);
    return result;
  }

  async addMemberToGroup(userId: string, conversationId: string, memberId: string): Promise<ApiResponse> {
    console.log('🔍 API SERVICE - addMemberToGroup called with:');
    console.log('  - userId:', userId);
    console.log('  - conversationId:', conversationId);
    console.log('  - memberId:', memberId);
    console.log('  - URL:', `/messaging/conversations/${conversationId}/members?userId=${userId}`);
    
    const result = await this.makeRequest(`/messaging/conversations/${conversationId}/members?userId=${userId}`, {
      method: 'POST',
      body: JSON.stringify({ memberId }),
    });
    
    console.log('🔍 API SERVICE - addMemberToGroup result:', result);
    return result;
  }

  async updateGroupName(userId: string, conversationId: string, newName: string): Promise<ApiResponse> {
    console.log('🔍 API SERVICE - updateGroupName called with:');
    console.log('  - userId:', userId);
    console.log('  - conversationId:', conversationId);
    console.log('  - newName:', newName);
    console.log('  - URL:', `/messaging/conversations/${conversationId}/name?userId=${userId}`);
    
    const result = await this.makeRequest(`/messaging/conversations/${conversationId}/name?userId=${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ name: newName }),
    });
    
    console.log('🔍 API SERVICE - updateGroupName result:', result);
    return result;
  }

  async markMessagesAsRead(userId: string, conversationId: string): Promise<ApiResponse> {
    console.log('🔍 API SERVICE - markMessagesAsRead called with:');
    console.log('  - userId:', userId);
    console.log('  - conversationId:', conversationId);
    console.log('  - URL:', `/messaging/conversations/${conversationId}/read?userId=${userId}`);
    
    const result = await this.makeRequest(`/messaging/conversations/${conversationId}/read?userId=${userId}`, {
      method: 'POST',
    });
    
    console.log('🔍 API SERVICE - markMessagesAsRead result:', result);
    return result;
  }

  // Notification methods
  async getStudentNotifications(studentId: string): Promise<ApiResponse> {
    console.log('🔍 API SERVICE - getStudentNotifications called with:');
    console.log('  - studentId:', studentId);
    console.log('  - URL:', `/notifications/student/${studentId}?userId=${studentId}`);
    
    const result = await this.makeRequest(`/notifications/student/${studentId}?userId=${studentId}`, {
      method: 'GET',
    });
    
    console.log('🔍 API SERVICE - getStudentNotifications result:', result);
    return result;
  }

  async markNotificationAsRead(notificationId: string, studentId: string): Promise<ApiResponse> {
    console.log('🔍 API SERVICE - markNotificationAsRead called with:');
    console.log('  - notificationId:', notificationId);
    console.log('  - studentId:', studentId);
    console.log('  - URL:', `/notifications/${notificationId}/read?userId=${studentId}`);
    
    const result = await this.makeRequest(`/notifications/${notificationId}/read?userId=${studentId}`, {
      method: 'POST',
      body: JSON.stringify({ studentId }),
    });
    
    console.log('🔍 API SERVICE - markNotificationAsRead result:', result);
    return result;
  }

  async markAllNotificationsAsRead(studentId: string): Promise<ApiResponse> {
    console.log('🔍 API SERVICE - markAllNotificationsAsRead called with:');
    console.log('  - studentId:', studentId);
    console.log('  - URL:', `/notifications/mark-all-read?userId=${studentId}`);
    
    const result = await this.makeRequest(`/notifications/mark-all-read?userId=${studentId}`, {
      method: 'POST',
      body: JSON.stringify({ studentId }),
    });
    
    console.log('🔍 API SERVICE - markAllNotificationsAsRead result:', result);
    return result;
  }

  // Coordinator notification methods
  async getCoordinatorNotifications(coordinatorId: string, userId: string): Promise<ApiResponse> {
    console.log('🔍 API SERVICE - getCoordinatorNotifications called with:');
    console.log('  - coordinatorId:', coordinatorId);
    console.log('  - userId:', userId);
    console.log('  - URL:', `/notifications/coordinator/${coordinatorId}?userId=${userId}`);
    
    const result = await this.makeRequest(`/notifications/coordinator/${coordinatorId}?userId=${userId}`, {
      method: 'GET',
    });
    
    console.log('🔍 API SERVICE - getCoordinatorNotifications result:', result);
    return result;
  }

  async markCoordinatorNotificationAsRead(notificationId: string, coordinatorId: string, userId: string): Promise<ApiResponse> {
    console.log('🔍 API SERVICE - markCoordinatorNotificationAsRead called with:');
    console.log('  - notificationId:', notificationId);
    console.log('  - coordinatorId:', coordinatorId);
    console.log('  - userId:', userId);
    console.log('  - URL:', `/notifications/coordinator/${notificationId}/read?userId=${userId}`);
    
    const result = await this.makeRequest(`/notifications/coordinator/${notificationId}/read?userId=${userId}`, {
      method: 'POST',
      body: JSON.stringify({ coordinatorId }),
    });
    
    console.log('🔍 API SERVICE - markCoordinatorNotificationAsRead result:', result);
    return result;
  }

  async markAllCoordinatorNotificationsAsRead(coordinatorId: string, userId: string): Promise<ApiResponse> {
    console.log('🔍 API SERVICE - markAllCoordinatorNotificationsAsRead called with:');
    console.log('  - coordinatorId:', coordinatorId);
    console.log('  - userId:', userId);
    console.log('  - URL:', `/notifications/coordinator/mark-all-read?userId=${userId}`);
    
    const result = await this.makeRequest(`/notifications/coordinator/mark-all-read?userId=${userId}`, {
      method: 'POST',
      body: JSON.stringify({ coordinatorId }),
    });
    
    console.log('🔍 API SERVICE - markAllCoordinatorNotificationsAsRead result:', result);
    return result;
  }

  // Company notification methods
  async getCompanyNotifications(companyId: string, userId: string): Promise<ApiResponse> {
    console.log('🔍 API SERVICE - getCompanyNotifications called with:');
    console.log('  - companyId:', companyId);
    console.log('  - userId:', userId);
    console.log('  - URL:', `/notifications/company/${companyId}?userId=${userId}`);
    
    const result = await this.makeRequest(`/notifications/company/${companyId}?userId=${userId}`, {
      method: 'GET',
    });
    
    console.log('🔍 API SERVICE - getCompanyNotifications result:', result);
    return result;
  }

  async markCompanyNotificationAsRead(notificationId: string, companyId: string, userId: string): Promise<ApiResponse> {
    console.log('🔍 API SERVICE - markCompanyNotificationAsRead called with:');
    console.log('  - notificationId:', notificationId);
    console.log('  - companyId:', companyId);
    console.log('  - userId:', userId);
    console.log('  - URL:', `/notifications/company/${notificationId}/read?userId=${userId}`);
    
    const result = await this.makeRequest(`/notifications/company/${notificationId}/read?userId=${userId}`, {
      method: 'POST',
      body: JSON.stringify({ companyId }),
    });
    
    console.log('🔍 API SERVICE - markCompanyNotificationAsRead result:', result);
    return result;
  }

  async markAllCompanyNotificationsAsRead(companyId: string, userId: string): Promise<ApiResponse> {
    console.log('🔍 API SERVICE - markAllCompanyNotificationsAsRead called with:');
    console.log('  - companyId:', companyId);
    console.log('  - userId:', userId);
    console.log('  - URL:', `/notifications/company/mark-all-read?userId=${userId}`);
    
    const result = await this.makeRequest(`/notifications/company/mark-all-read?userId=${userId}`, {
      method: 'POST',
      body: JSON.stringify({ companyId }),
    });
    
    console.log('🔍 API SERVICE - markAllCompanyNotificationsAsRead result:', result);
    return result;
  }

  // Campus Assignment methods
  async assignCoordinatorCampus(coordinatorId: string, campusType: 'in-campus' | 'off-campus', assignedBy: string): Promise<ApiResponse> {
    console.log('🔍 API SERVICE - assignCoordinatorCampus called with:');
    console.log('  - coordinatorId:', coordinatorId);
    console.log('  - campusType:', campusType);
    console.log('  - assignedBy:', assignedBy);
    console.log('  - URL:', `/coordinators/${coordinatorId}/campus-assignment`);
    
    const result = await this.makeRequest(`/coordinators/${coordinatorId}/campus-assignment`, {
      method: 'POST',
      body: JSON.stringify({ campusType, assignedBy }),
    });
    
    console.log('🔍 API SERVICE - assignCoordinatorCampus result:', result);
    return result;
  }

  async getCoordinatorCampusAssignment(coordinatorId: string): Promise<ApiResponse> {
    console.log('🔍 API SERVICE - getCoordinatorCampusAssignment called with:');
    console.log('  - coordinatorId:', coordinatorId);
    console.log('  - URL:', `/coordinators/${coordinatorId}/campus-assignment`);
    
    const result = await this.makeRequest(`/coordinators/${coordinatorId}/campus-assignment`);
    
    console.log('🔍 API SERVICE - getCoordinatorCampusAssignment result:', result);
    return result;
  }

  async updateCoordinatorCampusAssignment(coordinatorId: string, campusType: 'in-campus' | 'off-campus', updatedBy: string): Promise<ApiResponse> {
    console.log('🔍 API SERVICE - updateCoordinatorCampusAssignment called with:');
    console.log('  - coordinatorId:', coordinatorId);
    console.log('  - campusType:', campusType);
    console.log('  - updatedBy:', updatedBy);
    console.log('  - URL:', `/coordinators/${coordinatorId}/campus-assignment`);
    
    const result = await this.makeRequest(`/coordinators/${coordinatorId}/campus-assignment`, {
      method: 'PUT',
      body: JSON.stringify({ campusType, updatedBy }),
    });
    
    console.log('🔍 API SERVICE - updateCoordinatorCampusAssignment result:', result);
    return result;
  }

  async removeCoordinatorCampusAssignment(coordinatorId: string, removedBy: string): Promise<ApiResponse> {
    console.log('🔍 API SERVICE - removeCoordinatorCampusAssignment called with:');
    console.log('  - coordinatorId:', coordinatorId);
    console.log('  - removedBy:', removedBy);
    console.log('  - URL:', `/coordinators/${coordinatorId}/campus-assignment`);
    
    const result = await this.makeRequest(`/coordinators/${coordinatorId}/campus-assignment`, {
      method: 'DELETE',
      body: JSON.stringify({ removedBy }),
    });
    
    console.log('🔍 API SERVICE - removeCoordinatorCampusAssignment result:', result);
    return result;
  }

  // Intern methods
  async getCoordinatorInterns(coordinatorId: string): Promise<ApiResponse> {
    console.log('🔍 API SERVICE - getCoordinatorInterns called with coordinatorId:', coordinatorId);
    console.log('  - URL:', `/interns/coordinator/${coordinatorId}`);
    
    const result = await this.makeRequest(`/interns/coordinator/${coordinatorId}`, {
      method: 'GET',
    });
    
    console.log('🔍 API SERVICE - getCoordinatorInterns result:', result);
    return result;
  }

  // Working Hours API functions
  async getWorkingHours(companyId: string, userId: string): Promise<ApiResponse> {
    console.log('🕐 API SERVICE - getWorkingHours called');
    console.log('  - Company ID:', companyId);
    console.log('  - User ID:', userId);
    
    const result = await this.makeRequest(`/working-hours/${companyId}?userId=${userId}`, {
      method: 'GET',
    });
    
    console.log('🕐 API SERVICE - getWorkingHours result:', result);
    return result;
  }

  async setWorkingHours(companyId: string, userId: string, workingHours: {
    startTime: string;
    startPeriod: string;
    endTime: string;
    endPeriod: string;
    breakStart?: string;
    breakStartPeriod?: string;
    breakEnd?: string;
    breakEndPeriod?: string;
  }): Promise<ApiResponse> {
    console.log('🕐 API SERVICE - setWorkingHours called');
    console.log('  - Company ID:', companyId);
    console.log('  - User ID:', userId);
    console.log('  - Working Hours:', workingHours);
    
    const result = await this.makeRequest(`/working-hours/${companyId}?userId=${userId}`, {
      method: 'POST',
      body: JSON.stringify(workingHours),
    });
    
    console.log('🕐 API SERVICE - setWorkingHours result:', result);
    return result;
  }

  // Attendance API functions
  async getAttendanceRecords(companyId: string, userId: string, filters?: {
    startDate?: string;
    endDate?: string;
    internId?: string;
  }): Promise<ApiResponse> {
    console.log('📊 API SERVICE - getAttendanceRecords called');
    console.log('  - Company ID:', companyId);
    console.log('  - User ID:', userId);
    console.log('  - Filters:', filters);
    
    let url = `/attendance/${companyId}/records?userId=${userId}`;
    if (filters) {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.internId) params.append('internId', filters.internId);
      if (params.toString()) {
        url += `&${params.toString()}`;
      }
    }
    
    const result = await this.makeRequest(url);
    
    console.log('📊 API SERVICE - getAttendanceRecords result:', result);
    return result;
  }

  async saveAttendanceRecord(companyId: string, userId: string, attendanceData: {
    internId: string;
    attendanceDate: string;
    status: 'present' | 'absent' | 'late' | 'leave' | 'sick';
    amTimeIn?: string;
    amTimeOut?: string;
    pmTimeIn?: string;
    pmTimeOut?: string;
    amStatus?: 'present' | 'absent' | 'late' | 'leave' | 'sick' | 'not_marked';
    pmStatus?: 'present' | 'absent' | 'late' | 'leave' | 'sick' | 'not_marked';
    totalHours?: number;
    notes?: string;
  }): Promise<ApiResponse> {
    console.log('📊 API SERVICE - saveAttendanceRecord called');
    console.log('  - Company ID:', companyId, 'Type:', typeof companyId);
    console.log('  - User ID:', userId, 'Type:', typeof userId);
    console.log('  - Attendance Data:', attendanceData);
    console.log('  - URL will be:', `/attendance/${companyId}/records?userId=${userId}`);
    
    const result = await this.makeRequest(`/attendance/${companyId}/records?userId=${userId}`, {
      method: 'POST',
      body: JSON.stringify(attendanceData),
    });
    
    console.log('📊 API SERVICE - saveAttendanceRecord result:', result);
    return result;
  }

  async getTodayAttendance(companyId: string, userId: string): Promise<ApiResponse> {
    console.log('📊 API SERVICE - getTodayAttendance called');
    console.log('  - Company ID:', companyId);
    console.log('  - User ID:', userId);
    
    const url = `/attendance/${companyId}/today?userId=${userId}`;
    
    const result = await this.makeRequest(url);
    
    console.log('📊 API SERVICE - getTodayAttendance result:', result);
    return result;
  }

  async getAttendanceStats(companyId: string, userId: string, filters?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse> {
    console.log('📊 API SERVICE - getAttendanceStats called');
    console.log('  - Company ID:', companyId);
    console.log('  - User ID:', userId);
    console.log('  - Filters:', filters);
    
    let url = `/attendance/${companyId}/stats?userId=${userId}`;
    if (filters) {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (params.toString()) {
        url += `&${params.toString()}`;
      }
    }
    
    const result = await this.makeRequest(url);
    
    console.log('📊 API SERVICE - getAttendanceStats result:', result);
    return result;
  }

  // Evidence submission methods
  async submitEvidence(evidenceData: {
    title: string;
    description: string;
    imageUrl?: string;
    companyId: string;
    userId: string;
    submittedAt: string;
  }): Promise<ApiResponse> {
    console.log('📝 API SERVICE - submitEvidence called');
    console.log('  - Evidence data:', evidenceData);
    
    const url = `/evidences?userId=${evidenceData.userId}`;
    
    const result = await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(evidenceData),
    });
    
    console.log('📝 API SERVICE - submitEvidence result:', result);
    return result;
  }

  async uploadEvidenceImage(file: File | FormData, userId: string): Promise<ApiResponse> {
    console.log('📷 API SERVICE - uploadEvidenceImage called');
    console.log('  - User ID:', userId);
    
    const url = `/cloudinary/evidence-image?userId=${userId}`;
    
    let formData: FormData;
    
    if (file instanceof FormData) {
      // For mobile (React Native)
      formData = file;
    } else {
      // For web
      formData = new FormData();
      formData.append('image', file);
    }
    
    const result = await this.makeRequest(url, {
      method: 'POST',
      body: formData,
    }, true);
    
    console.log('📷 API SERVICE - uploadEvidenceImage result:', result);
    return result;
  }

  async getEvidences(userId: string, filters?: {
    companyId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse> {
    console.log('📋 API SERVICE - getEvidences called');
    console.log('  - User ID:', userId);
    console.log('  - Filters:', filters);
    
    let url = `/evidences?userId=${userId}`;
    if (filters) {
      const params = new URLSearchParams();
      if (filters.companyId) params.append('companyId', filters.companyId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());
      if (params.toString()) {
        url += `&${params.toString()}`;
      }
    }
    
    const result = await this.makeRequest(url);
    
    console.log('📋 API SERVICE - getEvidences result:', result);
    return result;
  }

  async getInternEvidences(internId: string, userId: string, filters?: {
    limit?: number;
    offset?: number;
    month?: number;
    year?: number;
  }): Promise<ApiResponse> {
    console.log('📋 API SERVICE - getInternEvidences called');
    console.log('  - Intern ID:', internId);
    console.log('  - User ID:', userId);
    console.log('  - Filters:', filters);
    
    let url = `/evidences/intern/${internId}?userId=${userId}`;
    if (filters) {
      const params = new URLSearchParams();
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());
      if (filters.month) params.append('month', filters.month.toString());
      if (filters.year) params.append('year', filters.year.toString());
      if (params.toString()) {
        url += `&${params.toString()}`;
      }
    }
    
    const result = await this.makeRequest(url);
    
    console.log('📋 API SERVICE - getInternEvidences result:', result);
    return result;
  }
}

// Create and export API service instance
export const apiService = new ApiService();

// Export types for use in components
export type { ApiResponse, RegisterData, Coordinator, CreateCoordinatorData, UpdateCoordinatorData };
