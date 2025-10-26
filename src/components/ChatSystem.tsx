import React, { useRef, useEffect } from 'react'
import { useGame } from '../context/GameContext'

const ChatSystem: React.FC = () => {
  const { state, dispatch } = useGame()
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [state.chatMessages])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const message = inputRef.current?.value.trim()
      if (message) {
        const player = state.players[state.currentPlayerId]
        dispatch({
          type: 'ADD_CHAT_MESSAGE',
          payload: {
            text: `${player?.name || 'Player'}: ${message}`,
            timestamp: Date.now()
          }
        })
        inputRef.current!.value = ''
      }
    }
  }

  return (
    <div className={`absolute bottom-4 left-4 z-10 p-4 bg-gray-900 bg-opacity-90 text-white rounded-lg shadow-lg w-80 ${state.showChat ? '' : 'hidden'}`}>
      <div ref={messagesRef} className="max-h-32 overflow-y-auto mb-2.5 text-xs">
        {state.chatMessages.slice(-10).map((msg, index) => (
          <div key={index} className="mb-1">
            {msg.text}
          </div>
        ))}
      </div>
      <input
        ref={inputRef}
        type="text"
        className="w-full p-1.5 border border-gray-600 rounded bg-gray-700 text-white"
        placeholder="Type a message..."
        onKeyPress={handleKeyPress}
      />
    </div>
  )
}

export default ChatSystem
