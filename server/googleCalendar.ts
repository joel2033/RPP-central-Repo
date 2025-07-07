import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { storage } from './storage';
import type { GoogleCalendarIntegration, CalendarEvent, InsertCalendarEvent } from '@shared/schema';

export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || `${process.env.REPLIT_DOMAINS}/api/auth/google/callback`
    );
  }

  // Generate OAuth URL for user to authorize
  generateAuthUrl(userId: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId, // Pass userId to identify user after callback
      prompt: 'consent' // Force consent to get refresh token
    });
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code: string): Promise<{ accessToken: string; refreshToken: string; expiry: Date }> {
    try {
      const { tokens } = await this.oauth2Client.getAccessToken(code);
      
      if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error('Failed to get required tokens');
      }

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiry: new Date(tokens.expiry_date || Date.now() + 3600000) // 1 hour default
      };
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw new Error('Failed to authorize Google Calendar access');
    }
  }

  // Refresh access token
  async refreshAccessToken(integration: GoogleCalendarIntegration): Promise<string> {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: integration.refreshToken
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      if (!credentials.access_token) {
        throw new Error('Failed to refresh access token');
      }

      // Update integration with new token
      await storage.updateGoogleCalendarIntegration(integration.id, {
        accessToken: credentials.access_token,
        tokenExpiry: new Date(credentials.expiry_date || Date.now() + 3600000)
      });

      return credentials.access_token;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw new Error('Failed to refresh Google Calendar access');
    }
  }

  // Set up authenticated client
  private async getAuthenticatedClient(integration: GoogleCalendarIntegration): Promise<OAuth2Client> {
    // Check if token needs refresh
    if (new Date() >= integration.tokenExpiry) {
      const newAccessToken = await this.refreshAccessToken(integration);
      integration.accessToken = newAccessToken;
    }

    this.oauth2Client.setCredentials({
      access_token: integration.accessToken,
      refresh_token: integration.refreshToken
    });

    return this.oauth2Client;
  }

  // Get user's Google Calendar events
  async fetchGoogleCalendarEvents(integration: GoogleCalendarIntegration, timeMin?: Date, timeMax?: Date): Promise<any[]> {
    try {
      const auth = await this.getAuthenticatedClient(integration);
      const calendar = google.calendar({ version: 'v3', auth });

      const response = await calendar.events.list({
        calendarId: integration.googleCalendarId,
        timeMin: (timeMin || new Date()).toISOString(),
        timeMax: (timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).toISOString(), // 30 days
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching Google Calendar events:', error);
      throw new Error('Failed to fetch Google Calendar events');
    }
  }

  // Create event in Google Calendar
  async createGoogleCalendarEvent(integration: GoogleCalendarIntegration, eventData: {
    summary: string;
    description?: string;
    start: Date;
    end: Date;
    location?: string;
  }): Promise<string> {
    try {
      const auth = await this.getAuthenticatedClient(integration);
      const calendar = google.calendar({ version: 'v3', auth });

      const event = {
        summary: eventData.summary,
        description: eventData.description,
        location: eventData.location,
        start: {
          dateTime: eventData.start.toISOString(),
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: eventData.end.toISOString(),
          timeZone: 'America/New_York',
        },
      };

      const response = await calendar.events.insert({
        calendarId: integration.googleCalendarId,
        requestBody: event,
      });

      if (!response.data.id) {
        throw new Error('Failed to create Google Calendar event');
      }

      return response.data.id;
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
      throw new Error('Failed to create Google Calendar event');
    }
  }

  // Update event in Google Calendar
  async updateGoogleCalendarEvent(integration: GoogleCalendarIntegration, googleEventId: string, eventData: {
    summary: string;
    description?: string;
    start: Date;
    end: Date;
    location?: string;
  }): Promise<void> {
    try {
      const auth = await this.getAuthenticatedClient(integration);
      const calendar = google.calendar({ version: 'v3', auth });

      const event = {
        summary: eventData.summary,
        description: eventData.description,
        location: eventData.location,
        start: {
          dateTime: eventData.start.toISOString(),
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: eventData.end.toISOString(),
          timeZone: 'America/New_York',
        },
      };

      await calendar.events.update({
        calendarId: integration.googleCalendarId,
        eventId: googleEventId,
        requestBody: event,
      });
    } catch (error) {
      console.error('Error updating Google Calendar event:', error);
      throw new Error('Failed to update Google Calendar event');
    }
  }

  // Delete event from Google Calendar
  async deleteGoogleCalendarEvent(integration: GoogleCalendarIntegration, googleEventId: string): Promise<void> {
    try {
      const auth = await this.getAuthenticatedClient(integration);
      const calendar = google.calendar({ version: 'v3', auth });

      await calendar.events.delete({
        calendarId: integration.googleCalendarId,
        eventId: googleEventId,
      });
    } catch (error) {
      console.error('Error deleting Google Calendar event:', error);
      throw new Error('Failed to delete Google Calendar event');
    }
  }

  // Sync Google Calendar events to our system (inbound sync)
  async syncInboundEvents(integration: GoogleCalendarIntegration): Promise<void> {
    try {
      const googleEvents = await this.fetchGoogleCalendarEvents(integration);
      
      for (const googleEvent of googleEvents) {
        if (!googleEvent.start || !googleEvent.end) continue;

        // Skip all-day events for now
        if (googleEvent.start.date) continue;

        const startDate = new Date(googleEvent.start.dateTime);
        const endDate = new Date(googleEvent.end.dateTime);

        // Check if this event already exists in our system
        const existingEvent = await storage.getCalendarEventByGoogleId(googleEvent.id);

        if (!existingEvent) {
          // Create new event as "external" type
          const eventData: InsertCalendarEvent = {
            title: googleEvent.summary || 'Google Calendar Event',
            type: 'external',
            start: startDate,
            end: endDate,
            allDay: false,
            photographerId: integration.userId,
            color: '#8b5cf6', // purple for external events
            description: googleEvent.description || '',
            licenseeId: integration.userId, // For now, use userId as licenseeId
            createdBy: integration.userId,
          };

          const createdEvent = await storage.createCalendarEvent(eventData);
          
          // Log sync
          await storage.createCalendarSyncLog({
            integrationId: integration.id,
            eventId: createdEvent.id.toString(),
            googleEventId: googleEvent.id,
            syncType: 'pull',
            status: 'success'
          });
        }
      }

      // Update last sync time
      await storage.updateGoogleCalendarIntegration(integration.id, {
        lastSyncAt: new Date()
      });

    } catch (error) {
      console.error('Error syncing inbound events:', error);
      
      // Log sync error
      await storage.createCalendarSyncLog({
        integrationId: integration.id,
        syncType: 'pull',
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Sync our job events to Google Calendar (outbound sync)
  async syncOutboundEvent(integration: GoogleCalendarIntegration, event: CalendarEvent): Promise<void> {
    try {
      if (event.type !== 'job') return; // Only sync job events

      const eventData = {
        summary: `${event.title} - Real Estate Photography`,
        description: event.description || '',
        start: new Date(event.start),
        end: new Date(event.end),
        location: event.description || '', // Could be property address
      };

      // Check if this event is already synced
      const syncLog = await storage.getCalendarSyncLogByEventId(event.id.toString());

      if (syncLog && syncLog.googleEventId) {
        // Update existing Google Calendar event
        await this.updateGoogleCalendarEvent(integration, syncLog.googleEventId, eventData);
        
        await storage.createCalendarSyncLog({
          integrationId: integration.id,
          eventId: event.id.toString(),
          googleEventId: syncLog.googleEventId,
          syncType: 'update',
          status: 'success'
        });
      } else {
        // Create new Google Calendar event
        const googleEventId = await this.createGoogleCalendarEvent(integration, eventData);
        
        await storage.createCalendarSyncLog({
          integrationId: integration.id,
          eventId: event.id.toString(),
          googleEventId: googleEventId,
          syncType: 'push',
          status: 'success'
        });
      }
    } catch (error) {
      console.error('Error syncing outbound event:', error);
      
      await storage.createCalendarSyncLog({
        integrationId: integration.id,
        eventId: event.id.toString(),
        syncType: 'push',
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Delete synced event from Google Calendar
  async deleteSyncedEvent(integration: GoogleCalendarIntegration, eventId: string): Promise<void> {
    try {
      const syncLog = await storage.getCalendarSyncLogByEventId(eventId);
      
      if (syncLog && syncLog.googleEventId) {
        await this.deleteGoogleCalendarEvent(integration, syncLog.googleEventId);
        
        await storage.createCalendarSyncLog({
          integrationId: integration.id,
          eventId: eventId,
          googleEventId: syncLog.googleEventId,
          syncType: 'delete',
          status: 'success'
        });
      }
    } catch (error) {
      console.error('Error deleting synced event:', error);
      
      await storage.createCalendarSyncLog({
        integrationId: integration.id,
        eventId: eventId,
        syncType: 'delete',
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();