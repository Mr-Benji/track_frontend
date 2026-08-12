import { apiClient } from '../../lib/apiClient'

export async function fetchMeetings() {
  return apiClient.get('/meetings')
}

export async function createMeeting({ title, date, time }) {
  return apiClient.post('/meetings', { title, date, time })
}

export async function updateMeeting({ meetingId, ...patch }) {
  return apiClient.patch(`/meetings/${meetingId}`, patch)
}

export async function deleteMeeting(meetingId) {
  return apiClient.delete(`/meetings/${meetingId}`)
}
