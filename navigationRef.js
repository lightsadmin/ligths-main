import { createNavigationContainerRef } from "@react-navigation/native";
import { NavigationContainer } from "@react-navigation/native";

export const navigationRef = createNavigationContainerRef();

<NavigationContainer ref={navigationRef}>{/* ... */}</NavigationContainer>;
