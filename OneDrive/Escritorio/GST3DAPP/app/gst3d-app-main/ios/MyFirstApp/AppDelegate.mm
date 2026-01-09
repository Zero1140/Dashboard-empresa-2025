#import "AppDelegate.h"
#import <Firebase.h>
#import <UserNotifications/UserNotifications.h>

#import <React/RCTBundleURLProvider.h>

@interface AppDelegate () <UNUserNotificationCenterDelegate>
@end

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  // Configurar Firebase con las nuevas credenciales
  [FIRApp configure];
  
  // Log de verificación
  NSLog(@"✅ Firebase configurado para iOS");
  NSLog(@"📱 Proyecto: gst3dapp");
  NSLog(@"🔑 Project ID: %@", [FIRApp defaultApp].options.projectID);
  
  // Configurar notificaciones para todas las versiones de iOS
  [self configureNotificationsForAllVersions];
  
  // ✅ Asegurar que delegate esté configurado (duplicado por seguridad)
  if (@available(iOS 10.0, *)) {
    UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
    center.delegate = self; // ¡NO ELIMINAR!
    
    // Registro automático de notificaciones remotas (React Native Firebase maneja permisos)
    dispatch_async(dispatch_get_main_queue(), ^{
      [application registerForRemoteNotifications];
    });
  }
  
  self.moduleName = @"com.wichisoft.gst3d";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (void)configureNotificationsForAllVersions {
  // ⚠️ CORRECCIÓN CRÍTICA: Mantener center.delegate = self (OBLIGATORIO)
  // NO eliminar delegate - es necesario para manejar notificaciones en foreground/background
  if (@available(iOS 10.0, *)) {
    UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
    
    // ✅ OBLIGATORIO: Mantener delegate = self (NO ELIMINAR)
    center.delegate = self;
    
    // ❌ NO solicitar permisos aquí - React Native Firebase lo maneja desde App.tsx
    // Solo registrar para notificaciones remotas después de que RN Firebase solicite permisos
    // El registro se hará desde React Native después de requestPermission()
  } else {
    // Fallback iOS 9 (ya casi no hay dispositivos)
    UIUserNotificationType allNotificationTypes = (UIUserNotificationTypeSound | UIUserNotificationTypeAlert | UIUserNotificationTypeBadge);
    UIUserNotificationSettings *settings = [UIUserNotificationSettings settingsForTypes:allNotificationTypes categories:nil];
    [[UIApplication sharedApplication] registerUserNotificationSettings:settings];
  }
  
  // ✅ El registro de notificaciones remotas se hace desde React Native con:
  // messaging().ios.registerForRemoteNotifications()
  // NO hacer aquí para evitar duplicación
}

// Manejo de notificaciones para iOS 10+
- (void)userNotificationCenter:(UNUserNotificationCenter *)center willPresentNotification:(UNNotification *)notification withCompletionHandler:(void (^)(UNNotificationPresentationOptions))completionHandler API_AVAILABLE(ios(10.0)) {
  // Mostrar notificación incluso cuando la app está en primer plano
  completionHandler(UNNotificationPresentationOptionAlert | UNNotificationPresentationOptionSound | UNNotificationPresentationOptionBadge);
}

- (void)userNotificationCenter:(UNUserNotificationCenter *)center didReceiveNotificationResponse:(UNNotificationResponse *)response withCompletionHandler:(void(^)(void))completionHandler API_AVAILABLE(ios(10.0)) {
  // Manejar interacción con notificación
  NSLog(@"📱 Usuario interactuó con notificación: %@", response.notification.request.content.userInfo);
  completionHandler();
}

// Manejo de tokens FCM
- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken {
  NSLog(@"✅ Token de dispositivo registrado: %@", deviceToken);
  // El token se maneja automáticamente por React Native Firebase
}

- (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error {
  NSLog(@"❌ Error al registrar notificaciones remotas: %@", error.localizedDescription);
}

// Manejo de notificaciones en background (iOS 9 y anteriores)
- (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo fetchCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler {
  NSLog(@"📱 Notificación recibida en background: %@", userInfo);
  completionHandler(UIBackgroundFetchResultNewData);
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end
