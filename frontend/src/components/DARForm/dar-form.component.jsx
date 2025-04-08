'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import axios from 'axios'; // Ensure axios is installed: npm install axios
import { AuthContext } from '../../context/AuthContext';
import { useContext } from 'react';

export default function DARForm() {
  const [formData, setFormData] = useState({
    date: '',
    shiftTime: '',
    report: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user } = useContext(AuthContext);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      // Replace with your actual API endpoint
      await axios.post(
        '/api/dars',
        {
          ...formData,
          username: user.username, // Associate DAR with the user
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`, // Include token if required
          },
        }
      );
      setSuccess('DAR submitted successfully!');
      setFormData({ date: '', shiftTime: '', report: '' });
    } catch (err) {
      console.error('DAR submission failed:', err);
      setError('Failed to submit DAR. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-red-500">{error}</p>}
      {success && <p className="text-green-500">{success}</p>}
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700">
          Date
        </label>
        <Input
          type="date"
          id="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          required
          className="mt-1 block w-full"
        />
      </div>
      <div>
        <label htmlFor="shiftTime" className="block text-sm font-medium text-gray-700">
          Shift Time
        </label>
        <Input
          type="text"
          id="shiftTime"
          name="shiftTime"
          placeholder="e.g., 9 PM - 5 AM"
          value={formData.shiftTime}
          onChange={handleChange}
          required
          className="mt-1 block w-full"
        />
      </div>
      <div>
        <label htmlFor="report" className="block text-sm font-medium text-gray-700">
          Report Details
        </label>
        <Textarea
          id="report"
          name="report"
          value={formData.report}
          onChange={handleChange}
          required
          className="mt-1 block w-full"
          placeholder="Enter your report details..."
        />
      </div>
      <Button type="submit" className="w-full bg-blue-500 text-white hover:bg-blue-600">
        Submit Report
      </Button>
    </form>
  );
}