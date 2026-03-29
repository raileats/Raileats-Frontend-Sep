import React, { useState, useEffect } from 'react';
import './TrainAutocomplete.css'; // Assume this is the CSS file for styling

const TrainAutocomplete = ({ fetchTrains }) => {
    const [loading, setLoading] = useState(false);
    const [trains, setTrains] = useState([]);
    const [error, setError] = useState('');

    const handleFetchTrains = async (inputValue) => {
        setLoading(true);
        setError('');
        try {
            const encodedValue = encodeURIComponent(inputValue);
            const response = await fetch(`https://api.example.com/trains?search=${encodedValue}`);
            const data = await response.json();
            setTrains(data.trains || []);
        } catch (err) {
            setError('Failed to fetch trains. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Example use of handleFetchTrains
        handleFetchTrains('example input');
    }, []);

    return (
        <div className="train-autocomplete">
            {loading && <p>Loading...</p>}
            {error && <p className="error-message">{error}</p>}
            {trains.length === 0 && !loading && <p>No trains found</p>}
            <ul>
                {trains.map((train) => (
                    <li key={train.id}>{train.name}</li>
                ))}
            </ul>
        </div>
    );
};

export default TrainAutocomplete;