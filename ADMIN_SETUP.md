# Настройка админ-панели

## Как сделать пользователя администратором

1. Откройте Firebase Console: https://console.firebase.google.com/
2. Выберите проект `zwebsitesimulator`
3. Перейдите в раздел **Firestore Database**
4. Найдите коллекцию `users`
5. Найдите документ пользователя (по его UID или email)
6. Откройте документ и добавьте/измените поле:
   - Поле: `isAdmin`
   - Тип: `boolean`
   - Значение: `true`
7. Сохраните изменения

После этого пользователь получит доступ к админ-панели и увидит кнопку "Админ" в шапке сайта.

## Функции админ-панели

- Просмотр всех зарегистрированных пользователей
- Просмотр информации о пользователях:
  - Никнейм
  - Email
  - Страна
  - IP адрес
  - Последний вход
  - Количество сессий
- Удаление пользователей (с подтверждением)

## Безопасность

- Админ-панель доступна только пользователям с `isAdmin: true` в Firestore
- Проверка прав доступа выполняется на клиенте и на сервере (через Firestore Security Rules)
- Рекомендуется настроить Firestore Security Rules для дополнительной защиты

## Firestore Security Rules (рекомендуется)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      // Users can read their own data
      allow read: if request.auth != null && request.auth.uid == userId;
      // Only admins can read all users
      allow list: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
      // Users can update their own data (except isAdmin)
      allow update: if request.auth != null && request.auth.uid == userId &&
        !request.resource.data.diff(resource.data).affectedKeys().hasAny(['isAdmin']);
      // Only admins can delete users
      allow delete: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```

