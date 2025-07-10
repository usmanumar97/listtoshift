// src/spotify/spotify.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../user/entities/user.entity';

@Injectable()
export class SpotifyService {
  private readonly clientId = this.cfg.get<string>('SPOTIFY_CLIENT_ID');
  private readonly clientSecret = this.cfg.get<string>('SPOTIFY_CLIENT_SECRET');
  private readonly redirectUri = this.cfg.get<string>('SPOTIFY_REDIRECT_URI');
  private readonly auth = Buffer.from(
    `${this.clientId}:${this.clientSecret}`,
  ).toString('base64');

  constructor(
    private cfg: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  /* 1. Build consent URL */
  getConsentUrl(state: string) {
    const scopes = [
      'playlist-read-private',
      'playlist-read-collaborative',
      'user-read-email',
    ].join('%20');
    return (
      `https://accounts.spotify.com/authorize?response_type=code` +
      `&client_id=${this.clientId}` +
      `&scope=${scopes}` +
      `&redirect_uri=${encodeURIComponent(this.redirectUri)}` +
      `&state=${state}`
    );
  }

  /* 2. Exchange code for tokens */
  async exchangeCode(userId: string, code: string) {
    const res = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${this.auth}`,
        },
      },
    );

    const { access_token, refresh_token, expires_in } = res.data;
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    await this.userModel.findByIdAndUpdate(userId, {
      spotify: {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt,
      },
    });
    return { connected: true };
  }

  /* 3. Refresh token if needed, return a valid access token */
  private async getValidToken(user: UserDocument): Promise<string> {
    if (user.spotify?.expiresAt && user.spotify.expiresAt > new Date())
      return user.spotify.accessToken;

    // refresh
    const res = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: user.spotify.refreshToken,
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${this.auth}`,
        },
      },
    );

    const { access_token, expires_in } = res.data;
    const expiresAt = new Date(Date.now() + expires_in * 1000);
    user.spotify.accessToken = access_token;
    user.spotify.expiresAt = expiresAt;
    await user.save();
    return access_token;
  }

  /* 4. List playlists */
  async listPlaylists(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user?.spotify) throw new UnauthorizedException('Spotify not linked');

    const token = await this.getValidToken(user);
    const { data } = await axios.get(
      'https://api.spotify.com/v1/me/playlists',
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return data.items.map((p) => ({
      id: p.id,
      name: p.name,
      tracks: p.tracks.total,
    }));
  }

  /* 5. List tracks in a playlist (simple, first 100) */
  async listTracks(userId: string, playlistId: string) {
    const user = await this.userModel.findById(userId);
    if (!user?.spotify) throw new UnauthorizedException('Spotify not linked');

    const token = await this.getValidToken(user);
    const { data } = await axios.get(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return data.items.map((t) => ({
      id: t.track.id,
      name: t.track.name,
      artist: t.track.artists.map((a) => a.name).join(', '),
      durationMs: t.track.duration_ms,
    }));
  }
}
