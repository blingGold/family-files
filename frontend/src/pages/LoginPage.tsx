import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Form, Input, NavBar, Toast } from 'antd-mobile';
import client from '../api/client';
import { useAuthStore } from '../store/auth';

export default function LoginPage() {
  const nav = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = useState(false);

  const onFinish = async (v: { username: string; password: string }) => {
    setLoading(true);
    try {
      const { data } = await client.post('/auth/login', v);
      setAuth(data.accessToken, data.user);
      nav('/');
    } catch (e: any) {
      Toast.show(e?.response?.data?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <NavBar>家庭病历档案</NavBar>
      <div style={{ padding: '40px 24px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 32 }}>登录</h2>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Header>账号</Form.Header>
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
            <Input placeholder="用户名" />
          </Form.Item>
          <Form.Item name="password" label="密码" type="password" rules={[{ required: true, min: 6 }]}>
            <Input placeholder="密码" />
          </Form.Item>
          <Button block type="submit" color="primary" loading={loading} style={{ marginTop: 24 }}>
            登录
          </Button>
        </Form>
      </div>
    </div>
  );
}
