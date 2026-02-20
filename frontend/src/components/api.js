import axios from 'axios';
import { API_BASE_URL } from '../config';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const getRobotStatus = async () => {
    try {
        const response = await api.get('/status');
        return response.data;
    } catch (error) {
        console.error('Error fetching robot status:', error);
        throw error;
    }
};

export const sendCommand = async (command) => {
    try {
        const response = await api.post('/command', command);
        return response.data;
    } catch (error) {
        console.error('Error sending command:', error);
        throw error;
    }
};

export const getMissions = async () => {
    try {
        const response = await api.get('/missions');
        return response.data;
    } catch (error) {
        console.error('Error fetching missions:', error);
        throw error;
    }
};

export const updateMission = async (mission) => {
    try {
        const response = await api.post('/mission/update', mission);
        return response.data;
    } catch (error) {
        console.error('Error updating mission:', error);
        throw error;
    }
};

// Export the axios instance for HTTP requests
export default api;