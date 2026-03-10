import { useEffect, useRef } from 'react';

const useOrderStream = (onUpdate) => {
  const eventSourceRef = useRef(null);

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const userId = userInfo.id;
    if (!userId) return;

    const connect = () => {
      // Close existing connection
      if (eventSourceRef.current) eventSourceRef.current.close();

      const token = localStorage.getItem('userToken');
      const es = new EventSource(
        `http://localhost:5000/api/orders/stream/${userId}`
      );

      es.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'ORDER_UPDATED') {
          onUpdate(data);
        }
      };

      es.onerror = () => {
        es.close();
        // Reconnect after 5 seconds
        setTimeout(connect, 5000);
      };

      eventSourceRef.current = es;
    };

    connect();

    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, []);
};

export default useOrderStream;