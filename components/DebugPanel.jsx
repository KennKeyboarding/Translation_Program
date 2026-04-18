// components/DebugPanel.jsx
//调试
export default function DebugPanel({ result }) {
  if (!result?.text_blocks || process.env.NODE_ENV !== 'development') return null;

  return (
    <details
      style={{
        marginTop: '20px',
        padding: '10px',
        backgroundColor: '#fff3cd',
        borderRadius: '5px',
      }}
    >
      <summary>调试信息（{result.total_blocks}个文本块）</summary>
      <pre style={{ fontSize: '12px', overflow: 'auto' }}>
        {JSON.stringify(result.text_blocks, null, 2)}
      </pre>
    </details>
  );
}