import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Button,Spinner } from '@org/ui';

@Component({
  imports: [RouterModule, Button, Spinner],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App {
  protected title = 'front-end';
}
