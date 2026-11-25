export function goBackOrHome(navigation: any) {
  if (navigation?.canGoBack?.()) navigation.goBack();
  else navigation?.navigate?.('Tabs', { screen: '首页Tab' });
}
