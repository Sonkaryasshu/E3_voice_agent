import axios from 'axios';

// Assuming backend runs on port 8000
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const agentApi = {
    list: async () => {
        const response = await api.get('/api/agents');
        return response.data;
    },
    create: async (data: any) => {
        const response = await api.post('/api/agents', data);
        return response.data;
    },
    update: async (id: string, data: any) => {
        const response = await api.put(`/api/agents/${id}`, data);
        return response.data;
    },
    get: async (id: string) => {
        const response = await api.get(`/api/agents/${id}`);
        return response.data;
    },
    getVoices: async () => {
        const response = await api.get('/api/agents/voices');
        return response.data;
    }
};

export const callApi = {
    trigger: async (data: any) => {
        const response = await api.post('/api/calls/trigger', data);
        return response.data;
    },
    registerWebCall: async (data: any) => {
        const response = await api.post('/api/calls/register-web-call', data);
        return response.data;
    },
    get: async (id: string) => {
        const response = await api.get(`/api/calls/${id}`);
        return response.data;
    },
    list: async () => {
        // We'll need to implement a list endpoint in backend if it doesn't exist
        const response = await api.get('/api/calls');
        return response.data;
    },
    analyze: async (id: string) => {
        const response = await api.post(`/api/calls/${id}/analyze`);
        return response.data;
    }
};
