// src/spotify/spotify.controller.ts
import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  Res,
  Param,
} from '@nestjs/common';
import { SpotifyService } from './spotify.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('spotify')
export class SpotifyController {
  constructor(private spotify: SpotifyService) {}

  /* Step 1: front-end hits this to get consent URL */
  @UseGuards(AuthGuard('jwt'))
  @Get('consent')
  consent(@Req() req) {
    const state = req.user._id.toString(); // simple CSRF token
    return { url: this.spotify.getConsentUrl(state) };
  }

  /* Step 2: Spotify redirects here */
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res,
  ) {
    await this.spotify.exchangeCode(state, code); // state === userId
    return res.redirect('/dashboard'); // or wherever
  }

  /* List playlists */
  @UseGuards(AuthGuard('jwt'))
  @Get('playlists')
  list(@Req() req) {
    return this.spotify.listPlaylists(req.user._id);
  }

  /* List tracks in a playlist */
  @UseGuards(AuthGuard('jwt'))
  @Get('playlists/:id')
  tracks(@Req() req, @Param('id') id: string) {
    return this.spotify.listTracks(req.user._id, id);
  }
}
