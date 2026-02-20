  import React, { useState } from 'react';
  import './GoalInterface.css';

  function GoalInterface({ goals, onAddGoal, onUpdateGoalStatus }) {
    console.log('GoalInterface goals prop:', goals);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('active'); // 'active' or 'completed'

    // Flatten all goals from all robots into a single array, with robotId attached
    const allGoals = goals
      ? Object.entries(goals).flatMap(([robotId, robotGoals]) =>
          (Array.isArray(robotGoals) ? robotGoals : []).map(goal => ({ ...goal, robotId }))
        )
      : [];

    const filteredGoals = allGoals.filter(goal =>
      activeTab === 'active'
        ? goal.status === 'current' || goal.status === 'queued'
        : goal.status === 'completed'
    );

    return (
      <div className="goal-interface-panel">
        <h2 className="goal-interface-header"
          style={{
            fontFamily: "'Poppins', 'Inter', 'Exo 2', 'Oxanium', 'Space Grotesk', 'Schibsted Grotesk', sans-serif",
            fontWeight: 600,
            fontOpticalSizing: 'auto',
            fontStyle: 'normal',
            color: 'black',
            letterSpacing: 0.5,
          }}
        >Mission Control</h2>
        
        {/* Moved tabs here - right after the header */}
        <div className="goal-tabs">
          <button
            className={activeTab === 'active' ? 'active' : ''}
            onClick={() => setActiveTab('active')}
          >
            Active Goals
          </button>
          <button
            className={activeTab === 'completed' ? 'active' : ''}
            onClick={() => setActiveTab('completed')}
          >
            Completed Goals
          </button>
        </div>

        <div className="add-goal-section">
          <h3>Add New Goal</h3>
          {/* X, Y coordinates and Add Goal button removed as requested */}
          {error && <p className="error-message">{error}</p>}
        </div>

        <div className="goal-lists">
          <ul>
            {filteredGoals.map(goal => (
              <li key={goal.id}>
                Goal at ({goal.x}, {goal.y}) - Status: {goal.status} (Robot: {goal.robotId})
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  export default GoalInterface;