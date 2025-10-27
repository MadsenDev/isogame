import React from 'react'

const Controls: React.FC = () => {
  return (
    <div className="habbo-floating-card">
      <h4 className="habbo-floating-card__title">Controls</h4>
      <ul className="habbo-floating-card__list">
        <li>Click to move your character</li>
        <li>Use tools to place furniture</li>
        <li>ESC to cancel actions</li>
        <li>1-4 to switch players</li>
        <li>Enter to chat</li>
      </ul>
    </div>
  )
}

export default Controls
