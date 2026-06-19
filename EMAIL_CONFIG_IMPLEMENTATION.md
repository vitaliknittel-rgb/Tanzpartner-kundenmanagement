# Email Configuration UI — Implementation Plan (Kundenmanagement)

**Goal:** Admin-Interface im Kundenmanagement zum Verwalten von SMTP-Settings + Email-Templates

---

## 📁 File Structure

```
src/
├── pages/
│   └── admin/
│       └── email-settings/
│           ├── index.jsx                 — Main Page (3 Tabs)
│           ├── components/
│           │   ├── SMTPSettings.jsx      — Tab 1: SMTP Configuration
│           │   ├── TemplateEditor.jsx    — Tab 2: Email Template Editor
│           │   ├── SendLog.jsx           — Tab 3: Email Logs
│           │   ├── TemplatePreview.jsx   — Live Template Preview
│           │   └── TestEmail.jsx         — Test Email Modal
│           └── styles/
│               └── email-settings.module.css

└── lib/
    └── emailConfig.js                     — API Calls
```

---

## 🎨 Component Breakdown

### 1. Main Page (`index.jsx`)
```jsx
export default function EmailSettingsPage() {
  const [activeTab, setActiveTab] = useState('smtp')
  
  return (
    <div className="email-settings-page">
      <h1>Email-Konfiguration</h1>
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tab label="SMTP-Einstellungen" value="smtp">
          <SMTPSettings />
        </Tab>
        <Tab label="Email-Templates" value="templates">
          <TemplateEditor />
        </Tab>
        <Tab label="Versand-Logs" value="logs">
          <SendLog />
        </Tab>
      </Tabs>
    </div>
  )
}
```

---

### 2. SMTP Settings Tab
```jsx
// SMTPSettings.jsx

const [smtp, setSMTP] = useState({
  host: '',
  port: 587,
  user: '',
  password: '',
  fromEmail: '',
  fromName: ''
})

const [testing, setTesting] = useState(false)
const [connected, setConnected] = useState(null)

const handleTest = async () => {
  setTesting(true)
  try {
    const result = await testSMTPConnection(smtp)
    setConnected(result.success)
  } catch (err) {
    setConnected(false)
  }
  setTesting(false)
}

const handleSave = async () => {
  await saveSMTPSettings(smtp)
  toast.success('SMTP-Einstellungen gespeichert!')
}

return (
  <div className="smtp-settings">
    <Input 
      label="SMTP Host" 
      value={smtp.host}
      onChange={(e) => setSMTP({...smtp, host: e.target.value})}
      placeholder="smtp.resend.com"
    />
    <Input 
      label="SMTP Port" 
      type="number"
      value={smtp.port}
      onChange={(e) => setSMTP({...smtp, port: parseInt(e.target.value)})}
      placeholder="587"
    />
    <Input 
      label="Username" 
      value={smtp.user}
      onChange={(e) => setSMTP({...smtp, user: e.target.value})}
    />
    <Input 
      label="Password" 
      type="password"
      value={smtp.password}
      onChange={(e) => setSMTP({...smtp, password: e.target.value})}
    />
    <Input 
      label="From Email" 
      value={smtp.fromEmail}
      onChange={(e) => setSMTP({...smtp, fromEmail: e.target.value})}
      placeholder="noreply@daseworld.com"
    />
    <Input 
      label="From Name" 
      value={smtp.fromName}
      onChange={(e) => setSMTP({...smtp, fromName: e.target.value})}
      placeholder="Tanzpartner"
    />

    <Button 
      onClick={handleTest}
      variant="secondary"
      disabled={testing}
    >
      {testing ? 'Verbindung wird getestet...' : 'Verbindung testen'}
    </Button>

    {connected === true && <Alert type="success">✅ Verbindung erfolgreich!</Alert>}
    {connected === false && <Alert type="error">❌ Verbindung fehlgeschlagen</Alert>}

    <Button onClick={handleSave} variant="primary">
      SMTP-Einstellungen speichern
    </Button>
  </div>
)
```

---

### 3. Email Template Editor Tab
```jsx
// TemplateEditor.jsx

const [templates, setTemplates] = useState({
  registration: null,
  password_reset: null,
  service_request: null
})

const [selectedType, setSelectedType] = useState('registration')
const [preview, setPreview] = useState(false)

const currentTemplate = templates[selectedType]

const handleSave = async () => {
  await saveEmailTemplate(selectedType, currentTemplate)
  toast.success(`${selectedType} Template gespeichert!`)
}

const handleSendTest = async () => {
  // Test-Email Modal öffnen
}

return (
  <div className="template-editor">
    <div className="template-selector">
      <Label>Template-Typ</Label>
      <Select value={selectedType} onChange={setSelectedType}>
        <option value="registration">Registrierung</option>
        <option value="password_reset">Passwort zurücksetzen</option>
        <option value="service_request">Service-Anfrage</option>
      </Select>
    </div>

    {currentTemplate && (
      <>
        <Input 
          label="Subject"
          value={currentTemplate.subject}
          onChange={(e) => setTemplates({
            ...templates,
            [selectedType]: {
              ...currentTemplate,
              subject: e.target.value
            }
          })}
          placeholder="E-Mail Betreff"
        />

        <RichTextEditor 
          label="HTML-Body"
          value={currentTemplate.body_html}
          onChange={(html) => setTemplates({
            ...templates,
            [selectedType]: {
              ...currentTemplate,
              body_html: html
            }
          })}
        />

        <TextArea 
          label="Text-Body (Fallback)"
          value={currentTemplate.body_text}
          onChange={(e) => setTemplates({
            ...templates,
            [selectedType]: {
              ...currentTemplate,
              body_text: e.target.value
            }
          })}
          rows={8}
        />

        <div className="options">
          <Input 
            label="CC Email (optional)"
            value={currentTemplate.cc_email || ''}
            onChange={(e) => setTemplates({
              ...templates,
              [selectedType]: {
                ...currentTemplate,
                cc_email: e.target.value
              }
            })}
          />
          
          <Checkbox 
            label="Kopie an Admin senden"
            checked={currentTemplate.send_copy_to_admin}
            onChange={(e) => setTemplates({
              ...templates,
              [selectedType]: {
                ...currentTemplate,
                send_copy_to_admin: e.target.checked
              }
            })}
          />
        </div>

        <div className="actions">
          <Button onClick={() => setPreview(!preview)} variant="secondary">
            {preview ? 'Editor zeigen' : 'Vorschau zeigen'}
          </Button>
          <Button onClick={handleSendTest} variant="secondary">
            Test-Email versenden
          </Button>
          <Button onClick={handleSave} variant="primary">
            Template speichern
          </Button>
        </div>
      </>
    )}

    {preview && currentTemplate && (
      <TemplatePreview template={currentTemplate} type={selectedType} />
    )}
  </div>
)
```

---

### 4. Template Preview Component
```jsx
// TemplatePreview.jsx

const SAMPLE_DATA = {
  registration: {
    appName: 'Tanzpartner',
    userName: 'Max Mustermann',
    appUrl: 'https://app.daseworld.com'
  },
  password_reset: {
    userName: 'Max Mustermann',
    resetLink: 'https://app.daseworld.com/reset-password/token123',
    expiresIn: '30 Minuten'
  },
  service_request: {
    requesterName: 'Max Mustermann',
    requesterEmail: 'max@example.com',
    message: 'Ich habe eine Frage zur Plattform...',
    dashboardUrl: 'https://kundenmanagement.daseworld.com',
    requestId: 'req_123'
  }
}

export default function TemplatePreview({ template, type }) {
  const replaceVariables = (text) => {
    let result = text
    const data = SAMPLE_DATA[type]
    Object.keys(data).forEach(key => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), data[key])
    })
    return result
  }

  return (
    <div className="template-preview">
      <div className="preview-info">
        <h3>Vorschau mit Sample-Daten:</h3>
      </div>
      <div className="preview-email">
        <div className="preview-subject">
          <strong>Subject:</strong> {replaceVariables(template.subject)}
        </div>
        <div className="preview-body">
          <div dangerouslySetInnerHTML={{
            __html: replaceVariables(template.body_html)
          }} />
        </div>
      </div>
    </div>
  )
}
```

---

### 5. Send Log Tab
```jsx
// SendLog.jsx

const [logs, setLogs] = useState([])
const [filter, setFilter] = useState({
  eventType: null,
  status: null
})

useEffect(() => {
  loadLogs()
}, [filter])

const loadLogs = async () => {
  const data = await getEmailSendLog(filter)
  setLogs(data)
}

return (
  <div className="send-log">
    <div className="filters">
      <Select 
        value={filter.eventType || ''}
        onChange={(e) => setFilter({...filter, eventType: e.target.value})}
      >
        <option value="">Alle Event-Types</option>
        <option value="registration">Registrierung</option>
        <option value="password_reset">Passwort zurücksetzen</option>
        <option value="service_request">Service-Anfrage</option>
      </Select>

      <Select 
        value={filter.status || ''}
        onChange={(e) => setFilter({...filter, status: e.target.value})}
      >
        <option value="">Alle Status</option>
        <option value="sent">✅ Versendet</option>
        <option value="failed">❌ Fehlgeschlagen</option>
        <option value="bounced">⚠️ Bounced</option>
      </Select>

      <Button onClick={() => setFilter({eventType: null, status: null})}>
        Filter zurücksetzen
      </Button>
    </div>

    <table className="log-table">
      <thead>
        <tr>
          <th>Empfänger</th>
          <th>Event-Type</th>
          <th>Betreff</th>
          <th>Status</th>
          <th>Versendet am</th>
          <th>Fehler</th>
        </tr>
      </thead>
      <tbody>
        {logs.map(log => (
          <tr key={log.id}>
            <td>{log.recipient_email}</td>
            <td>{log.event_type}</td>
            <td>{log.subject}</td>
            <td>
              {log.status === 'sent' && '✅'}
              {log.status === 'failed' && '❌'}
              {log.status === 'bounced' && '⚠️'}
              {' '}{log.status}
            </td>
            <td>{new Date(log.sent_at).toLocaleString()}</td>
            <td>{log.error_message}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)
```

---

## 🔗 API Service (`lib/emailConfig.js`)

```javascript
export async function getSMTPSettings() {
  const response = await fetch('/api/admin/email-settings')
  return response.json()
}

export async function saveSMTPSettings(config) {
  const response = await fetch('/api/admin/email-settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  })
  return response.json()
}

export async function testSMTPConnection(config) {
  const response = await fetch('/api/admin/email-settings/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  })
  return response.json()
}

export async function getEmailTemplate(eventType) {
  const response = await fetch(`/api/admin/email-templates/${eventType}`)
  return response.json()
}

export async function saveEmailTemplate(eventType, template) {
  const response = await fetch(`/api/admin/email-templates/${eventType}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template)
  })
  return response.json()
}

export async function getEmailSendLog(filters) {
  const params = new URLSearchParams(filters).toString()
  const response = await fetch(`/api/admin/email-send-log?${params}`)
  return response.json()
}

export async function sendTestEmail(config, template, testEmail) {
  const response = await fetch('/api/admin/email-settings/send-test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config, template, testEmail })
  })
  return response.json()
}
```

---

## 🚀 Implementation Timeline

```
Day 1 (4h):
- Database Schema + RLS Policies
- API Routes (/api/admin/email-settings, /api/admin/email-templates)
- emailConfig.js Service

Day 2 (3h):
- Main Page + Tabs
- SMTPSettings Component
- TemplateEditor Component
- TemplatePreview Component
- SendLog Component

Day 3 (2h):
- Integration Tests
- Error Handling
- Polish UI
```

---

**Status:** 🔵 Ready to Implement  
**Complexity:** Medium  
**Dependencies:** nodemailer, react-quill (for HTML editor)
