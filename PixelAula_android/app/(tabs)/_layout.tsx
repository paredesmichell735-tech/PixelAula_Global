import React from 'react';
import { Tabs } from 'expo-router';
import { colors } from '../../src/design-system/theme/colors';
import {
  IconNavExplora,
  IconNavAprende,
  IconNavLogros,
  IconNavCrea,
  IconNavComunidad,
} from '../../src/assets/registry/SvgIcons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.cyan,
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          backgroundColor: '#07122D',
          borderTopColor: '#1A336E',
          borderTopWidth: 1.5,
          height: 66,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: 'monospace',
          fontSize: 9.5,
          fontWeight: '700',
          letterSpacing: 0.5,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'EXPLORA',
          tabBarIcon: ({ color }) => <IconNavExplora color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="subjects"
        options={{
          title: 'APRENDE',
          tabBarIcon: ({ color }) => <IconNavAprende color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="missions"
        options={{
          title: 'LOGROS',
          tabBarIcon: ({ color }) => <IconNavLogros color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="avatar"
        options={{
          title: 'CREA',
          tabBarIcon: ({ color }) => <IconNavCrea color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'COMUNIDAD',
          tabBarIcon: ({ color }) => <IconNavComunidad color={color} size={22} />,
        }}
      />
    </Tabs>
  );
}
