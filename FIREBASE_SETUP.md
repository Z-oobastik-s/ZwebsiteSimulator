# Настройка Firebase для проекта

## Проблема: `auth/configuration-not-found`

Эта ошибка означает, что Firebase Authentication не включен в вашем проекте. Следуйте инструкциям ниже.

## Шаг 1: Включить Firebase Authentication

1. Откройте [Firebase Console](https://console.firebase.google.com/)
2. Выберите проект **zwebsitesimulator**
3. В левом меню найдите раздел **Build** → **Authentication**
4. Нажмите **Get started** (если видите это сообщение)
5. Перейдите на вкладку **Sign-in method**
6. Нажмите на **Email/Password**
7. Включите переключатель **Enable**
8. Нажмите **Save**

**Важно:** Email/Password должен быть включен, иначе регистрация не будет работать!

## Шаг 2: Создать Firestore Database (для профилей пользователей)

Firestore нужен для хранения профилей пользователей и их статистики.

1. В Firebase Console перейдите в **Build** → **Firestore Database**
2. Нажмите **Create database**
3. Выберите **Standard edition** (достаточно для начала)
4. Выберите **location** (рекомендуется выбрать ближайший к вам регион, например `europe-west` или `us-central`)
5. Нажмите **Enable**

### Настройка Security Rules для Firestore

После создания базы данных:

1. Перейдите на вкладку **Rules**
2. Замените правила на следующие:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      // Users can read their own data
      allow read: if request.auth != null && request.auth.uid == userId;
      // Users can create their own document
      allow create: if request.auth != null && request.auth.uid == userId;
      // Users can update their own data (except isAdmin)
      allow update: if request.auth != null && request.auth.uid == userId &&
        !request.resource.data.diff(resource.data).affectedKeys().hasAny(['isAdmin']);
      // Only admins can read all users (for admin panel)
      allow list: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
      // Only admins can delete users
      allow delete: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // Multiplayer rooms (for existing multiplayer feature)
    match /rooms/{roomId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Нажмите **Publish**

## Шаг 3: Настроить Firebase Storage (для фото профилей)

1. Перейдите в **Build** → **Storage**
2. Нажмите **Get started**
3. Выберите **Start in test mode** (для начала)
4. Выберите **location** (тот же, что и для Firestore)
5. Нажмите **Done**

### Security Rules для Storage

1. Перейдите на вкладку **Rules**
2. Замените правила на:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Profile photos
    match /profile-photos/{userId}/{allPaths=**} {
      // Users can upload their own photos
      allow write: if request.auth != null && request.auth.uid == userId;
      // Anyone can read profile photos
      allow read: if true;
    }
  }
}
```

3. Нажмите **Publish**

## Шаг 4: Проверка конфигурации

Убедитесь, что в файле `scripts/firebase-config.js` указаны правильные данные:

- `apiKey` - должен совпадать с вашим проектом
- `authDomain` - должен быть `zwebsitesimulator.firebaseapp.com`
- `projectId` - должен быть `zwebsitesimulator`
- `storageBucket` - должен быть `zwebsitesimulator.firebasestorage.app`

Эти данные можно найти в Firebase Console:
1. Нажмите на иконку ⚙️ (Settings) → **Project settings**
2. Прокрутите вниз до раздела **Your apps**
3. Если приложения нет, нажмите **Add app** → **Web** (</>)
4. Скопируйте конфигурацию

## Что делать после настройки

1. **Перезагрузите сайт** (Ctrl+F5 для полной перезагрузки)
2. Попробуйте зарегистрироваться снова
3. Если ошибка остаётся, проверьте консоль браузера (F12) на наличие других ошибок

## Предупреждение о безопасности (CVE-2025-55182)

Это предупреждение касается React/Next.js приложений. Наш проект использует чистый JavaScript, поэтому это предупреждение не критично для нас. Вы можете его игнорировать, или:

1. Убедитесь, что все зависимости обновлены
2. Если используете какие-то npm пакеты, обновите их до последних версий

## Частые проблемы

### Ошибка: "Firebase: Error (auth/configuration-not-found)"
**Решение:** Убедитесь, что Email/Password включен в Authentication → Sign-in method

### Ошибка: "Permission denied" при сохранении профиля
**Решение:** Проверьте Firestore Security Rules, они должны быть опубликованы

### Ошибка: "Storage permission denied"
**Решение:** Проверьте Storage Security Rules

### База данных не создаётся
**Решение:** Убедитесь, что выбран правильный проект и у вас есть права на создание баз данных

## Полезные ссылки

- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Storage Documentation](https://firebase.google.com/docs/storage)

