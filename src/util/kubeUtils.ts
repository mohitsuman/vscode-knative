/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { QuickPickItem } from "vscode";
import { KubeConfig } from '@kubernetes/client-node';
import { User, Cluster } from "@kubernetes/client-node/dist/config_types";

export default class KubeConfigUtils extends KubeConfig {

    constructor() {
        super();
        this.loadFromDefault();
    }

    getServers(): QuickPickItem[] {
        const currentCluster = this.getCurrentCluster();
        const clusters = this.clusters || [];
        return clusters.map((c: any) => ({
            label: c.server,
            description: currentCluster && c.name === currentCluster.name ? 'Current Context' : ''
        }));
    }

    getClusterUsers(clusterServer: string): QuickPickItem[] {
        const currentUser = this.getCurrentUser();
        const cluster = this.findCluster(clusterServer);
        const users = this.getUsers();
        const clusterUsers = users.filter((item) => cluster && item.name.includes(cluster.name));
        return clusterUsers.map((u: User) => ({
            label: u.name.split('/')[0],
            description: u === currentUser ? 'Current Context' : ''
        }));
    }

    findCluster(clusterServer: string): Cluster {
        return this.getClusters().find((cluster: Cluster) => cluster.server === clusterServer);
    }
}
