# Mini Chat

HTML, CSS, JavaScript + Node.js/Express로 만든 한국어 AI 챗봇입니다. OpenAI의 `gpt-4o-mini` 모델을 사용합니다.

## 로컬 실행

Node.js 22 이상을 설치한 뒤 실행합니다.

```sh
npm install
```

`.env.example`을 `.env`로 복사하고 `OPENAI_API_KEY`에 실제 키를 입력합니다. 기존 `.env`가 있다면 덮어쓰지 말고 필요한 변수만 확인하세요.

```sh
npm run dev
```

브라우저에서 http://localhost:3000 을 엽니다. 일반 실행은 `npm start`, 테스트는 `npm test`입니다. PowerShell에서 실행 정책 오류가 나면 `npm.cmd`를 사용하세요.

## Vercel 배포

1. `.env`와 `node_modules`를 제외한 프로젝트를 GitHub 저장소에 올립니다.
2. Vercel에서 **Add New → Project**로 저장소를 가져옵니다. Framework Preset은 **Other**, 프로젝트 루트는 이 폴더로 선택합니다. 별도 빌드 명령은 필요하지 않습니다.
3. 프로젝트의 **Settings → Environment Variables**에서 `OPENAI_API_KEY`를 추가합니다. 필요한 Production/Preview 환경에 적용하세요.
4. Deploy를 실행합니다. 환경변수를 나중에 변경했다면 다시 배포합니다.

`vercel.json`은 `public/` 정적 파일과 `api/index.js` Express 서버리스 함수를 연결합니다. API 경로는 `POST /api/chat`입니다.

## 대화 처리

- 대화는 브라우저의 JavaScript 메모리에만 보관합니다. DB, 파일 저장, localStorage를 사용하지 않습니다. 새로고침, 탭 닫기, 새 대화 시 초기화됩니다.
- 매 요청에 최근 20회의 사용자/AI 대화와 새 질문을 함께 전송합니다. 오래된 대화는 모델에 전달되지 않습니다.
- 서버는 시스템 지시문을 추가한 뒤 OpenAI Chat Completions API를 호출합니다. `store: false`를 사용합니다. 질문과 이전 대화는 답변 생성을 위해 OpenAI로 전송됩니다.
- 한 메시지는 최대 4,000자, 답변은 최대 1,000토큰입니다. 서버 요청 본문은 128KB로 제한합니다.
- 답변 생성 중 중복 전송을 막고, 실패하면 질문을 입력창에 복원합니다. 모델 답변은 `textContent`로 표시하여 HTML을 실행하지 않습니다.
- API 키는 서버에서만 읽으며 클라이언트에 전송하지 않습니다. 기존 `.env` 파일은 유지됩니다.

공개 배포 시 누구나 API를 호출할 수 있는 학습용 구조입니다. 운영 서비스에는 인증과 공유 저장소 기반 요청 제한을 추가하고 OpenAI 사용량을 관리하세요.

## 파일 구조

```text
api/index.js        Express API와 OpenAI 호출
server.js           로컬 서버와 정적 파일 제공
public/index.html   화면 구조
public/style.css    반응형 스타일
public/app.js       대화 기록과 화면 동작
test/chat.test.js   API 동작 테스트 (OpenAI 모의 응답)
vercel.json         Vercel 배포 설정
.env.example        환경변수 예시
```

참고: [OpenAI Chat Completions](https://developers.openai.com/api/reference/resources/chat), [Vercel Functions](https://vercel.com/docs/functions).
