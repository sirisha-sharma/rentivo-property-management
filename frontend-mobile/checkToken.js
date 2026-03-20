// Run this in Expo Go console or browser console
import AsyncStorage from '@react-native-async-storage/async-storage';

const checkToken = async () => {
    const token = await AsyncStorage.getItem('token');
    console.log('Token:', token);
    console.log('Token length:', token?.length);
    console.log('Is valid format:', token?.split('.').length === 3);
};

checkToken();
